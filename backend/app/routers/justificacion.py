import os
import uuid
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
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
    if fecha > get_peru_today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pueden registrar justificaciones para fechas futuras."
        )

    # Validate tipo
    try:
        tipo_enum = TipoJustificacion(tipo)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tipo inválido. Debe ser: justificacion_tardanza o justificacion_inasistencia",
        )

    # Validate alumno exists
    alumno = db.query(Alumno).filter(Alumno.dni == alumno_dni, Alumno.activo == True).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")

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

        # Save file
        ext = os.path.splitext(archivo.filename)[1] if archivo.filename else ""
        unique_name = f"{uuid.uuid4()}{ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_name)

        with open(file_path, "wb") as f:
            f.write(content)

        archivo_url = f"/uploads/{unique_name}"
        archivo_nombre = archivo.filename

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

    db.add(justificacion)

    # Update attendance record to "justificacion" state if it exists
    asistencia = (
        db.query(Asistencia)
        .filter(Asistencia.alumno_dni == alumno_dni, Asistencia.fecha == fecha)
        .first()
    )
    if asistencia:
        asistencia.estado = EstadoAsistencia.justificacion

    db.commit()
    db.refresh(justificacion)

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
        .filter(Alumno.grado_id == grado_id)
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
