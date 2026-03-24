from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.recuperacion import DiaRecuperacion
from app.models.asistencia import Asistencia
from app.models.docente import Docente
from app.schemas.recuperacion import DiaRecuperacionOut, DiaRecuperacionCreate
from app.middleware.auth_middleware import get_current_user, require_director

router = APIRouter(prefix="/api/recuperaciones", tags=["Recuperaciones"])

@router.get("/", response_model=List[DiaRecuperacionOut])
def listar_recuperaciones(
    db: Session = Depends(get_db),
    current_user: Docente = Depends(get_current_user)
):
    """Listar todos los días de recuperación programados."""
    return db.query(DiaRecuperacion).order_by(DiaRecuperacion.fecha.desc()).all()

@router.post("/", response_model=DiaRecuperacionOut)
def crear_recuperacion(
    request: DiaRecuperacionCreate,
    db: Session = Depends(get_db),
    director: Docente = Depends(require_director)
):
    """Programar un día de recuperación (Solo Directores)."""
    exists = db.query(DiaRecuperacion).filter(DiaRecuperacion.fecha == request.fecha).first()
    if exists:
        raise HTTPException(status_code=400, detail="Ya existe una recuperación para esta fecha.")
    
    nuevo = DiaRecuperacion(fecha=request.fecha, descripcion=request.descripcion)
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    
    # Invalidar caches globales
    from app.redis_client import invalidate_cache
    invalidate_cache("dashboard:*")
    
    return nuevo

@router.delete("/{id}")
def eliminar_recuperacion(
    id: int,
    db: Session = Depends(get_db),
    director: Docente = Depends(require_director)
):
    """Eliminar un día de recuperación (Solo Directores).
    Regla: No se puede eliminar si ya hay asistencias registradas en esa fecha.
    """
    recup = db.query(DiaRecuperacion).filter(DiaRecuperacion.id == id).first()
    if not recup:
        raise HTTPException(status_code=404, detail="Recuperación no encontrada.")
    
    # Validar si hay asistencias
    hay_asistencias = db.query(Asistencia).filter(Asistencia.fecha == recup.fecha).first()
    if hay_asistencias:
        raise HTTPException(
            status_code=400, 
            detail="No se puede desactivar este día porque ya existen registros de asistencia."
        )
    
    db.delete(recup)
    db.commit()
    
    # Invalidar caches globales
    from app.redis_client import invalidate_cache
    invalidate_cache("dashboard:*")
    
    return {"message": "Día de recuperación eliminado con éxito."}
