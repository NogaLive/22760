from datetime import date, datetime, time
from sqlalchemy.orm import Session
from sqlalchemy import not_
from fastapi import HTTPException, status
from app.models.alumno import Alumno
from app.models.asistencia import Asistencia, EstadoAsistencia
from app.models.modificacion import ModificacionRegistro
from app.models.feriado import Feriado
from app.models.docente import Docente, RolDocente
from app.models.configuracion import Configuracion
from app.models.recuperacion import DiaRecuperacion
from app.schemas.asistencia import (
    RegistrarAsistenciaResponse,
    AsistenciaOut,
    AsistenciaListResponse,
)
from app.redis_client import invalidate_cache
from app.utils.timezone import get_peru_now, get_peru_today

def registrar_asistencia_por_qr(
    db: Session,
    codigo_qr: str,
    docente_dni: int,
    estado: str | None = None,
) -> RegistrarAsistenciaResponse:
    """Register attendance by scanning a student's QR code. Calculates state based on Peru time."""
    ahora_dt = get_peru_now()
    hoy = ahora_dt.date()
    ahora = ahora_dt.time()

    # Find student by QR code (Moved up to avoid UnboundLocalError)
    alumno = db.query(Alumno).filter(Alumno.codigo_qr == codigo_qr, Alumno.activo == True).first()
    if not alumno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alumno no encontrado o código QR inválido",
        )

    # Security Check: Docentes only scan their assigned grades. Director can scan everyone. (Moved up)
    docente = db.query(Docente).filter(Docente.dni == docente_dni).first()
    if not docente:
        raise HTTPException(status_code=404, detail="Docente que registra no encontrado")
    
    if docente.rol == RolDocente.docente:
        grado_ids_asignados = [g.id for g in docente.grados]
        if alumno.grado_id not in grado_ids_asignados:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"No tiene permisos para registrar asistencia a alumnos de otros grados (ID Alumno: {alumno.grado_id})."
            )

    # Restricciones de Año Escolar (desde Configuracion)
    inicio_escolar_cfg = db.query(Configuracion).filter(Configuracion.clave == 'inicio_escolar').first()
    fin_escolar_cfg = db.query(Configuracion).filter(Configuracion.clave == 'fin_escolar').first()

    if inicio_escolar_cfg:
        try:
            fecha_inicio = date.fromisoformat(inicio_escolar_cfg.valor)
            if hoy < fecha_inicio:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El Año Escolar aún no ha comenzado. (Inicia: {fecha_inicio.strftime('%d/%m/%Y')})"
                )
        except ValueError:
            pass
    
    if fin_escolar_cfg:
        try:
            fecha_fin = date.fromisoformat(fin_escolar_cfg.valor)
            if hoy > fecha_fin:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El Año Escolar ya ha finalizado. (Finalizó: {fecha_fin.strftime('%d/%m/%Y')})"
                )
        except ValueError:
            pass

    # Verificar si es un Feriado Institucional o Nacional
    feriado_hoy = db.query(Feriado).filter(Feriado.fecha == hoy).first()
    
    if feriado_hoy:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Día Inactivo: {feriado_hoy.descripcion} (Feriado). No se pueden registrar asistencias."
        )

    # Check if it's a working day (Mon-Fri) or a scheduled Recovery Day
    if hoy.weekday() >= 5:
        # Weekend: Only allow if it's a scheduled recovery day
        recup_hoy = db.query(DiaRecuperacion).filter(DiaRecuperacion.fecha == hoy).first()
        if not recup_hoy:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Día No Laborable: Los fines de semana están bloqueados a menos que se programen como Día de Recuperación."
            )


    # Resolve estado based on business logic if not explicitly forced by request
    if estado:
        try:
            estado_enum = EstadoAsistencia(estado)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Estado inválido: {estado}.",
            )
    else:
        # Dynamic Threshold Logic
        from app.models.grado import NivelGrado
        nivel = alumno.grado.nivel
        
        # Default fallback times if config is missing (safety)
        if nivel == NivelGrado.inicial:
            clave_entrada = "hora_entrada_inicial"
            clave_tardanza = "hora_asistencia_inicial" # Threshold for Tardanza (starts at 8:15)
            clave_falta = "hora_tardanza_inicial"      # Threshold for Falta (starts at 9:00)
        else:
            clave_entrada = "hora_entrada_primaria"
            clave_tardanza = "hora_asistencia_primaria" # Threshold for Tardanza (starts at 8:00)
            clave_falta = "hora_tardanza_primaria"      # Threshold for Falta (starts at 9:00)

        conf_entrada = db.query(Configuracion).filter(Configuracion.clave == clave_entrada).first()
        conf_tardanza = db.query(Configuracion).filter(Configuracion.clave == clave_tardanza).first()
        conf_falta = db.query(Configuracion).filter(Configuracion.clave == clave_falta).first()
        
        # Parsing config strings "HH:MM:SS"
        try:
            h_entrada = datetime.strptime(conf_entrada.valor, "%H:%M:%S").time() if conf_entrada else time(7, 30)
            h_tardanza = datetime.strptime(conf_tardanza.valor, "%H:%M:%S").time() if conf_tardanza else time(8, 0)
            h_falta = datetime.strptime(conf_falta.valor, "%H:%M:%S").time() if conf_falta else time(9, 0)
        except:
            h_entrada = time(7, 30)
            h_tardanza = time(8, 0)
            h_falta = time(9, 0)

        hora_fin = time(13, 0)
        
        if ahora < h_entrada or ahora > hora_fin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Fuera de horario de ingreso. El registro inicia a las {h_entrada.strftime('%H:%M:%S')} y finaliza a las 1:00 PM. (Hora actual: {ahora.strftime('%H:%M:%S')})"
            )
        
        if ahora < h_tardanza:
            estado_enum = EstadoAsistencia.asistencia
        elif ahora < h_falta:
            estado_enum = EstadoAsistencia.tardanza
        else:
            estado_enum = EstadoAsistencia.inasistencia # Marked as Lack after 9:00 AM



    # Check if already registered today
    existing = (
        db.query(Asistencia)
        .filter(Asistencia.alumno_dni == alumno.dni, Asistencia.fecha == hoy)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El alumno {alumno.nombres} {alumno.apellidos} ya tiene registro hoy: {existing.estado.value}",
        )

    # Create attendance record
    asistencia = Asistencia(
        alumno_dni=alumno.dni,
        fecha=hoy,
        estado=estado_enum,
        hora_registro=ahora,
        registrado_por=docente_dni,
    )
    db.add(asistencia)
    db.commit()
    db.refresh(asistencia)

    # Invalidate dashboard cache
    invalidate_cache("dashboard:*")

    return RegistrarAsistenciaResponse(
        id=asistencia.id,
        alumno_dni=alumno.dni,
        alumno_nombre=f"{alumno.nombres} {alumno.apellidos}",
        fecha=hoy,
        estado=estado_enum.value,
        hora_registro=ahora,
        mensaje=f"Asistencia registrada para {alumno.nombres} {alumno.apellidos}",
    )

def auto_marcar_faltas(db: Session, grado_id: int, hoy: date):
    """
    Internal trigger to automatically create 'inasistencia' records for students
    who haven't been marked by the daily 'Falta' threshold.
    """
    # 1. Basic validation: is it a school day?
    if hoy.weekday() >= 5:
        # Weekend: Only if it's a recovery day
        if not db.query(DiaRecuperacion).filter(DiaRecuperacion.fecha == hoy).first():
            return
    
    if db.query(Feriado).filter(Feriado.fecha == hoy).first():
        return

    # 2. Get the threshold time for this grade
    grado_item = db.query(Alumno).filter(Alumno.grado_id == grado_id).first()
    if not grado_item or not grado_item.grado:
        return
    
    from app.models.grado import NivelGrado
    nivel = grado_item.grado.nivel
    clave_falta = "hora_tardanza_inicial" if nivel == NivelGrado.inicial else "hora_tardanza_primaria"
    
    conf_falta = db.query(Configuracion).filter(Configuracion.clave == clave_falta).first()
    try:
        h_falta = datetime.strptime(conf_falta.valor, "%H:%M:%S").time() if conf_falta else time(9, 0)
    except:
        h_falta = time(9, 0)

    # 3. Check if time has passed
    ahora_dt = get_peru_now()
    if ahora_dt.date() != hoy or ahora_dt.time() < h_falta:
        return # Not time yet or not checking for today

    # 4. Find students without attendance records for today
    # Using a select for efficiency and to avoid SAWarning
    from sqlalchemy import select
    existing_DNIs = select(Asistencia.alumno_dni).where(Asistencia.fecha == hoy)
    
    missing_students = (
        db.query(Alumno)
        .filter(
            Alumno.grado_id == grado_id,
            Alumno.activo == True,
            not_(Alumno.dni.in_(existing_DNIs))
        )
        .all()
    )

    if not missing_students:
        return

    # 5. Get a system registrar (Director)
    # Using a literal DNI if possible or finding the first director
    director = db.query(Docente).filter(Docente.rol == "director").first()
    registrado_por = director.dni if director else 1 # Fallback to 1 if no director

    # 6. Create mass 'inasistencia' records
    print(f"DEBUG [Auto-Falta]: Marking {len(missing_students)} students as ABSENT for grade {grado_id}")
    for student in missing_students:
        asistencia = Asistencia(
            alumno_dni=student.dni,
            fecha=hoy,
            estado=EstadoAsistencia.inasistencia,
            registrado_por=registrado_por,
            hora_registro=h_falta # Register at the threshold time
        )
        db.add(asistencia)
    
    try:
        db.commit()
        # Invalidate dashboard cache since we added records
        invalidate_cache("dashboard:*")
        print(f"DEBUG [Auto-Falta]: Success.")
    except Exception as e:
        db.rollback()
        print(f"DEBUG [Auto-Falta]: Error during commit: {str(e)}")


def listar_asistencias_por_grado(
    db: Session,
    grado_id: int,
    fecha: date | None = None,
) -> AsistenciaListResponse:
    """List attendance records for a grade, optionally filtered by date."""
    hoy = get_peru_today()
    target_date = fecha if fecha else hoy

    # Active Trigger: If checking today and deadline passed, auto-mark missing as absent
    if target_date == hoy:
        auto_marcar_faltas(db, grado_id, hoy)

    query = (
        db.query(Asistencia)
        .join(Alumno, Asistencia.alumno_dni == Alumno.dni)
        .filter(Alumno.grado_id == grado_id, Asistencia.fecha == target_date)
    )

    asistencias = query.order_by(Alumno.apellidos).all()
    print(f"DEBUG [AsistenciaService]: Found {len(asistencias)} records for grade {grado_id} on {target_date}.")

    result = []
    for a in asistencias:
        result.append(
            AsistenciaOut(
                id=a.id,
                alumno_dni=a.alumno_dni,
                alumno_nombres=a.alumno.nombres,
                alumno_apellidos=a.alumno.apellidos,
                fecha=a.fecha,
                estado=a.estado.value,
                hora_registro=a.hora_registro,
                registrado_por=a.registrado_por,
            )
        )

    return AsistenciaListResponse(asistencias=result, total=len(result))


def modificar_asistencia(
    db: Session,
    asistencia_id: int,
    director_dni: int,
    estado: str | None = None,
    hora_registro: time | None = None,
) -> AsistenciaOut:
    """Modify an attendance record (director only). Creates audit log."""
    asistencia = db.query(Asistencia).filter(Asistencia.id == asistencia_id).first()
    if not asistencia:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro de asistencia no encontrado",
        )

    # Track modifications for audit
    if estado and estado != asistencia.estado.value:
        try:
            nuevo_estado = EstadoAsistencia(estado)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Estado inválido: {estado}",
            )
        mod = ModificacionRegistro(
            asistencia_id=asistencia.id,
            campo_modificado="estado",
            valor_anterior=asistencia.estado.value,
            valor_nuevo=estado,
            modificado_por=director_dni,
        )
        db.add(mod)
        asistencia.estado = nuevo_estado

    if hora_registro and hora_registro != asistencia.hora_registro:
        mod = ModificacionRegistro(
            asistencia_id=asistencia.id,
            campo_modificado="hora_registro",
            valor_anterior=str(asistencia.hora_registro) if asistencia.hora_registro else "null",
            valor_nuevo=str(hora_registro),
            modificado_por=director_dni,
        )
        db.add(mod)
        asistencia.hora_registro = hora_registro

    db.commit()
    db.refresh(asistencia)

    # Invalidate dashboard cache
    invalidate_cache("dashboard:*")

    return AsistenciaOut(
        id=asistencia.id,
        alumno_dni=asistencia.alumno_dni,
        alumno_nombres=asistencia.alumno.nombres,
        alumno_apellidos=asistencia.alumno.apellidos,
        fecha=asistencia.fecha,
        estado=asistencia.estado.value,
        hora_registro=asistencia.hora_registro,
        registrado_por=asistencia.registrado_por,
    )


def override_asistencia_manual(
    db: Session,
    alumno_dni: int,
    estado: str,
    director_dni: int,
) -> AsistenciaOut:
    """Directly override or create an attendance record from the Roster Table Drops."""
    # Find student
    alumno = db.query(Alumno).filter(Alumno.dni == alumno_dni, Alumno.activo == True).first()
    if not alumno:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alumno no encontrado")
        
    try:
        nuevo_estado = EstadoAsistencia(estado)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Estado inválido: {estado}")

    hoy = get_peru_today()
    ahora = get_peru_now().time()
    
    asistencia = (
        db.query(Asistencia)
        .filter(Asistencia.alumno_dni == alumno_dni, Asistencia.fecha == hoy)
        .first()
    )
    
    if asistencia:
        # Existing timecard: Update and log
        if asistencia.estado != nuevo_estado:
            mod = ModificacionRegistro(
                asistencia_id=asistencia.id,
                campo_modificado="estado",
                valor_anterior=asistencia.estado.value,
                valor_nuevo=estado,
                modificado_por=director_dni,
            )
            db.add(mod)
            asistencia.estado = nuevo_estado
    else:
        # No timecard: Create manually
        asistencia = Asistencia(
            alumno_dni=alumno.dni,
            fecha=hoy,
            estado=nuevo_estado,
            hora_registro=ahora,
            registrado_por=director_dni,
        )
        db.add(asistencia)

    db.commit()
    db.refresh(asistencia)
    invalidate_cache("dashboard:*")

    return AsistenciaOut(
        id=asistencia.id,
        alumno_dni=asistencia.alumno_dni,
        alumno_nombres=alumno.nombres,
        alumno_apellidos=alumno.apellidos,
        fecha=asistencia.fecha,
        estado=asistencia.estado.value,
        hora_registro=asistencia.hora_registro,
        registrado_por=asistencia.registrado_por,
    )
