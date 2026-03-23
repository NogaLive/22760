from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.middleware.auth_middleware import get_current_user, require_director
from app.models.docente import Docente
from app.schemas.asistencia import (
    RegistrarAsistenciaRequest,
    RegistrarAsistenciaResponse,
    ModificarAsistenciaRequest,
    AsistenciaManualRequest,
    AsistenciaOut,
    AsistenciaListResponse,
)
from app.services.asistencia_service import (
    registrar_asistencia_por_qr,
    listar_asistencias_por_grado,
    modificar_asistencia,
)

router = APIRouter(prefix="/api/asistencia", tags=["Asistencia"])


@router.post("/registrar", response_model=RegistrarAsistenciaResponse)
def registrar_asistencia(
    request: RegistrarAsistenciaRequest,
    db: Session = Depends(get_db),
    current_user: Docente = Depends(get_current_user),
):
    """Registrar asistencia escaneando código QR del alumno."""
    return registrar_asistencia_por_qr(
        db=db,
        codigo_qr=request.codigo_qr,
        docente_dni=current_user.dni,
        estado=request.estado
    )


@router.get("/grado/{grado_id}", response_model=AsistenciaListResponse)
def listar_asistencias(
    grado_id: int,
    fecha: Optional[date] = Query(None, description="Filtrar por fecha (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: Docente = Depends(get_current_user),
):
    """Listar asistencias de un grado, opcionalmente filtradas por fecha."""
    from app.utils.timezone import get_peru_today
    if not fecha:
        fecha = get_peru_today()
    return listar_asistencias_por_grado(db=db, grado_id=grado_id, fecha=fecha)


@router.put("/{asistencia_id}", response_model=AsistenciaOut)
def modificar_registro(
    asistencia_id: int,
    request: ModificarAsistenciaRequest,
    db: Session = Depends(get_db),
    director: Docente = Depends(require_director),
):
    """Modificar un registro de asistencia (solo director). Genera log de auditoría."""
    return modificar_asistencia(
        db=db,
        asistencia_id=asistencia_id,
        director_dni=director.dni,
        estado=request.estado,
        hora_registro=request.hora_registro,
    )

@router.post("/override", response_model=AsistenciaOut)
def override_manual(
    request: AsistenciaManualRequest,
    db: Session = Depends(get_db),
    current_user: Docente = Depends(get_current_user),
):
    """Crea o modifica directamente un estado de asistencia desde el listado."""
    from app.services.asistencia_service import override_asistencia_manual
    return override_asistencia_manual(
        db=db,
        alumno_dni=request.alumno_dni,
        estado=request.estado,
        director_dni=current_user.dni,
    )
