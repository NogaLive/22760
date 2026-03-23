from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.docente import Docente
from app.schemas.dashboard import DashboardResponse, RiesgoDesercionResponse
from app.services.dashboard_service import get_dashboard_general, get_dashboard_grado, get_riesgo_desercion
from app.redis_client import invalidate_cache

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/general", response_model=DashboardResponse)
def dashboard_general(
    filtro: str = Query("hoy", description="hoy | semana | mes | año"),
    db: Session = Depends(get_db),
    current_user: Docente = Depends(get_current_user),
):
    """Dashboard general con KPIs y datos para gráficos.
    Director ve todos los grados. Docente ve solo sus grados asignados."""
    grado_ids = None
    if current_user.rol.value == "docente":
        grado_ids = [g.id for g in current_user.grados]
        
    return get_dashboard_general(db=db, filtro=filtro, grado_ids=grado_ids)


@router.get("/grado/{grado_id}", response_model=DashboardResponse)
def dashboard_grado(
    grado_id: int,
    filtro: str = Query("hoy", description="hoy | semana | mes | año"),
    db: Session = Depends(get_db),
    current_user: Docente = Depends(get_current_user),
):
    """Dashboard KPIs y gráficos para un grado específico."""
    return get_dashboard_grado(db=db, grado_id=grado_id, filtro=filtro)


@router.post("/actualizar")
def actualizar_dashboard(
    current_user: Docente = Depends(get_current_user),
):
    """Invalidar caché del dashboard para forzar actualización."""
    invalidate_cache("dashboard:*")
    return {"mensaje": "Caché del dashboard actualizado"}

@router.get("/riesgo-desercion", response_model=RiesgoDesercionResponse)
def riesgo_desercion(
    grado_id: int | None = Query(None, description="ID del grado a filtrar"),
    db: Session = Depends(get_db),
    current_user: Docente = Depends(get_current_user),
):
    """Listar alumnos con nivel de riesgo de deserción escolar.
    Director ve todos los grados o puede filtrar. Docentes ven solo sus asignados o un sub-filtro."""
    
    # Base permissions list
    allowed_grado_ids = None
    if current_user.rol.value == "docente":
        allowed_grado_ids = [g.id for g in current_user.grados]

    # Combine with explicit request filter
    if grado_id is not None:
        if allowed_grado_ids is not None and grado_id not in allowed_grado_ids:
            return RiesgoDesercionResponse(riesgos=[]) # No tiene permiso para ese grado
        allowed_grado_ids = [grado_id]
        
    return get_riesgo_desercion(db=db, grado_ids=allowed_grado_ids)
