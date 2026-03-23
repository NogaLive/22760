from datetime import date, datetime, time
from sqlalchemy.orm import Session
from sqlalchemy import not_
from fastapi import HTTPException, status
from app.models.alumno import Alumno
from app.models.asistencia import Asistencia, EstadoAsistencia
from app.models.modificacion import ModificacionRegistro
from app.models.feriado import Feriado
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

    # Restricciones de Año Escolar
    inicio_escolar = db.query(Feriado).filter(Feriado.tipo == 'inicio_escolar').first()
    fin_escolar = db.query(Feriado).filter(Feriado.tipo == 'fin_escolar').first()

    if inicio_escolar and hoy < inicio_escolar.fecha:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El Año Escolar aún no ha comenzado. (Inicia: {inicio_escolar.fecha})"
        )
    
    if fin_escolar and hoy > fin_escolar.fecha:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El Año Escolar ya ha finalizado. (Finalizó: {fin_escolar.fecha})"
        )

    # Verificar si es un Feriado Institucional o Nacional explícitamente excluyendo las configs
    feriado_hoy = db.query(Feriado).filter(
        Feriado.fecha == hoy,
        not_(Feriado.tipo.in_(['inicio_escolar', 'fin_escolar']))
    ).first()
    
    if feriado_hoy:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Día Inactivo: {feriado_hoy.descripcion} (Feriado). No se pueden registrar asistencias."
        )

    if hoy.weekday() >= 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Día no laborable: No se registran asistencias sábados ni domingos.",
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
        # Time logic checks -> 7:45 AM threshold inside school hours (7:00 AM -> 1:00 PM)
        limite_tardanza = time(7, 45)
        hora_inicio = time(7, 0)
        hora_fin = time(13, 0)
        
        if ahora < hora_inicio or ahora > hora_fin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Fuera de horario laboral. Solo se permite escanear QR's y registrar asistencias entre las 7:00 AM y la 1:00 PM."
            )
        
        if ahora <= limite_tardanza:
            estado_enum = EstadoAsistencia.asistencia
        else:
            estado_enum = EstadoAsistencia.tardanza

    # Find student by QR code
    alumno = db.query(Alumno).filter(Alumno.codigo_qr == codigo_qr, Alumno.activo == True).first()
    if not alumno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alumno no encontrado o código QR inválido",
        )

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


def listar_asistencias_por_grado(
    db: Session,
    grado_id: int,
    fecha: date | None = None,
) -> AsistenciaListResponse:
    """List attendance records for a grade, optionally filtered by date."""
    from app.redis_client import get_cached, set_cached
    cache_key = f"asistencia:grado:{grado_id}:{fecha}"
    cached = get_cached(cache_key)
    if cached:
        return AsistenciaListResponse(**cached)

    query = (
        db.query(Asistencia)
        .join(Alumno, Asistencia.alumno_dni == Alumno.dni)
        .filter(Alumno.grado_id == grado_id)
    )

    if fecha:
        query = query.filter(Asistencia.fecha == fecha)

    asistencias = query.order_by(Asistencia.fecha.desc(), Alumno.apellidos).all()

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

    response = AsistenciaListResponse(asistencias=result, total=len(result))
    set_cached(cache_key, response.model_dump(), ttl=60) # cache for 60s
    return response


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
