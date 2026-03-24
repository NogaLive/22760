import os
import uuid
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import StreamingResponse
import httpx
from sqlalchemy.orm import Session
from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.docente import Docente
from app.models.alumno import Alumno
from app.models.asistencia import Asistencia, EstadoAsistencia
from app.models.justificacion import Justificacion, TipoJustificacion
from app.schemas.justificacion import (
    CrearJustificacionRequest,
    JustificacionOut,
    JustificacionListResponse,
)
from app.utils.timezone import get_peru_today
from app.redis_client import invalidate_cache
from app.services.storage_service import storage_service

router = APIRouter(prefix="/api/justificaciones", tags=["Justificaciones"])


UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

@router.post("/registrar", response_model=JustificacionOut, status_code=status.HTTP_201_CREATED)
async def registrar_justificacion_endpoint(
    alumno_dni: int = Form(...),
    fecha: date = Form(...),
    tipo: str = Form(...),
    descripcion: str = Form(...),
    archivo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: Docente = Depends(get_current_user),
):
    """
    Registrar una justificación (manual).
    Si ya existe un registro de inasistencia/tardanza ese día, se actualizará
    el estado en la tabla de Asistencia para reflejar la justificación.
    """
    # Business logic simple validations
    hoy = get_peru_today()
    print(f"DEBUG [Justificacion]: Attempting registration. Student: {alumno_dni}, Date: {fecha}, Peru Today: {hoy}")
    print(f"DEBUG: Attempting justification for student {alumno_dni} on date {fecha}. (Peru Today: {hoy})")
    
    if fecha > hoy:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se pueden registrar justificaciones para fechas futuras. (Hoy es {hoy}, intentaste {fecha})"
        )

    # Validate tipo
    try:
        tipo_enum = TipoJustificacion(tipo)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tipo inválido. Debe ser: justificacion_tardanza o justificacion_inasistencia",
        )

    # Validate alumno exists and is active
    alumno = db.query(Alumno).filter(Alumno.dni == alumno_dni, Alumno.activo == True).first()
    if not alumno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Alumno no encontrado o está inactivo."
        )

    # Check for existing justification for this student on this date
    existing = (
        db.query(Justificacion)
        .filter(Justificacion.alumno_dni == alumno_dni, Justificacion.fecha == fecha)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe una justificación registrada para este alumno en la fecha {fecha}. ID: {existing.id}"
        )

    # Handle file upload
    archivo_url = None
    archivo_nombre = None
    if archivo:
        # Check file size
        content = await archivo.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El archivo no puede superar 5MB",
            )

        # Upload to Supabase Storage
        try:
            archivo_url = storage_service.upload_file(
                file_content=content,
                file_name=archivo.filename,
                content_type=archivo.content_type
            )
            archivo_nombre = archivo.filename
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al subir archivo a Supabase: {str(e)}"
            )

    # Create justificacion
    justificacion = Justificacion(
        alumno_dni=alumno_dni,
        fecha=fecha,
        tipo=tipo_enum,
        descripcion=descripcion,
        archivo_url=archivo_url,
        archivo_nombre=archivo_nombre,
        registrado_por=current_user.dni,
    )

    try:
        db.add(justificacion)
        db.flush() # Ensure we have justification.id
        print(f"DEBUG [Justificacion]: Created Justificacion ID {justificacion.id} for student {alumno_dni}")

        # Update or CREATE attendance record to "justificacion" state
        asistencia = (
            db.query(Asistencia)
            .filter(Asistencia.alumno_dni == alumno_dni, Asistencia.fecha == fecha)
            .first()
        )
        if asistencia:
            print(f"DEBUG [Justificacion]: Updating existing Attendance record (ID: {asistencia.id}). New state: {EstadoAsistencia.justificacion}")
            asistencia.estado = EstadoAsistencia.justificacion
        else:
            print(f"DEBUG [Justificacion]: Creating NEW Attendance record for Student {alumno_dni} on {fecha}. State: {EstadoAsistencia.justificacion}")
            asistencia = Asistencia(
                alumno_dni=alumno_dni,
                fecha=fecha,
                estado=EstadoAsistencia.justificacion,
                registrado_por=current_user.dni
            )
            db.add(asistencia)
        
        db.commit()
        db.refresh(justificacion)
        if asistencia:
            db.refresh(asistencia)
            print(f"DEBUG [Justificacion]: Final state committed. Attendance ID {asistencia.id} is now {asistencia.estado.value}")
    except Exception as e:
        db.rollback()
        print(f"DEBUG: Error during justification commit: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al guardar la justificación en la base de datos: {str(e)}"
        )

    # Invalidate dashboard cache
    invalidate_cache("dashboard:*")

    return JustificacionOut(
        id=justificacion.id,
        alumno_dni=justificacion.alumno_dni,
        alumno_nombres=alumno.nombres,
        alumno_apellidos=alumno.apellidos,
        fecha=justificacion.fecha,
        tipo=justificacion.tipo.value,
        descripcion=justificacion.descripcion,
        archivo_url=justificacion.archivo_url,
        archivo_nombre=justificacion.archivo_nombre,
        registrado_por=justificacion.registrado_por,
    )


@router.get("/grado/{grado_id}", response_model=JustificacionListResponse)
def listar_justificaciones(
    grado_id: int,
    db: Session = Depends(get_db),
    current_user: Docente = Depends(get_current_user),
):
    """Listar justificaciones de un grado."""
    justificaciones = (
        db.query(Justificacion)
        .join(Alumno, Justificacion.alumno_dni == Alumno.dni)
        .filter(Alumno.grado_id == grado_id, Alumno.activo == True)
        .order_by(Justificacion.fecha.desc())
        .all()
    )

    result = [
        JustificacionOut(
            id=j.id,
            alumno_dni=j.alumno_dni,
            alumno_nombres=j.alumno.nombres,
            alumno_apellidos=j.alumno.apellidos,
            fecha=j.fecha,
            tipo=j.tipo.value,
            descripcion=j.descripcion,
            archivo_url=j.archivo_url,
            archivo_nombre=j.archivo_nombre,
            registrado_por=j.registrado_por,
        )
        for j in justificaciones
    ]

    return JustificacionListResponse(justificaciones=result, total=len(result))


@router.get("/descargar/{justificacion_id}")
async def descargar_evidencia_endpoint(
    justificacion_id: int,
    db: Session = Depends(get_db),
):
    """
    Endpoint proxy para descargar la evidencia directamente.
    Útil para enlaces en Excel que requieren forzar la descarga en lugar de previsualizar.
    """
    justificacion = db.query(Justificacion).filter(Justificacion.id == justificacion_id).first()
    if not justificacion or not justificacion.archivo_url:
        raise HTTPException(status_code=404, detail="Archivo no encontrado o no tiene evidencia adjunta")
    
    async def stream_file():
        async with httpx.AsyncClient() as client:
            async with client.stream("GET", justificacion.archivo_url) as r:
                if r.status_code != 200:
                    return
                async for chunk in r.aiter_bytes():
                    yield chunk

    filename = justificacion.archivo_nombre or f"evidencia_{justificacion.alumno_dni}.png"
    return StreamingResponse(
        stream_file(),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.put("/{justificacion_id}", response_model=JustificacionOut)
async def actualizar_justificacion_endpoint(
    justificacion_id: int,
    tipo: str = Form(...),
    descripcion: str = Form(...),
    archivo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: Docente = Depends(get_current_user),
):
    """Actualizar una justificación existente."""
    justificacion = db.query(Justificacion).filter(Justificacion.id == justificacion_id).first()
    if not justificacion:
        raise HTTPException(status_code=404, detail="Justificación no encontrada")

    # Validate tipo
    try:
        tipo_enum = TipoJustificacion(tipo)
    except ValueError:
        raise HTTPException(status_code=400, detail="Tipo inválido.")

    # Update basic fields
    justificacion.tipo = tipo_enum
    justificacion.descripcion = descripcion

    # Handle file update
    if archivo:
        content = await archivo.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="Archivo demasiado grande")
        
        try:
            archivo_url = storage_service.upload_file(
                file_content=content,
                file_name=archivo.filename,
                content_type=archivo.content_type
            )
            justificacion.archivo_url = archivo_url
            justificacion.archivo_nombre = archivo.filename
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error en storage: {str(e)}")

    db.commit()
    db.refresh(justificacion)

    return JustificacionOut(
        id=justificacion.id,
        alumno_dni=justificacion.alumno_dni,
        alumno_nombres=justificacion.alumno.nombres,
        alumno_apellidos=justificacion.alumno.apellidos,
        fecha=justificacion.fecha,
        tipo=justificacion.tipo.value,
        descripcion=justificacion.descripcion,
        archivo_url=justificacion.archivo_url,
        archivo_nombre=justificacion.archivo_nombre,
        registrado_por=justificacion.registrado_por,
    )
