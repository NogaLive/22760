from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.configuracion import Configuracion
from app.models.docente import Docente
from app.schemas.configuracion import ConfiguracionOut, ConfiguracionUpdate
from app.middleware.auth_middleware import get_current_user, require_director

router = APIRouter(prefix="/api/configuracion", tags=["Configuración"])

@router.get("/", response_model=List[ConfiguracionOut])
def listar_configuraciones(
    db: Session = Depends(get_db),
    current_user: Docente = Depends(get_current_user)
):
    """Listar todas las configuraciones del sistema."""
    return db.query(Configuracion).all()

@router.get("/{clave}", response_model=ConfiguracionOut)
def obtener_configuracion(
    clave: str, 
    db: Session = Depends(get_db),
    current_user: Docente = Depends(get_current_user)
):
    """Obtener una configuración específica por su clave."""
    config = db.query(Configuracion).filter(Configuracion.clave == clave).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuración no encontrada")
    return config

@router.put("/{clave}", response_model=ConfiguracionOut)
def actualizar_configuracion(
    clave: str,
    request: ConfiguracionUpdate,
    db: Session = Depends(get_db),
    director: Docente = Depends(require_director)
):
    """Actualizar una configuración (Solo Directores)."""
    config = db.query(Configuracion).filter(Configuracion.clave == clave).first()
    if not config:
        # Si no existe, la creamos (o podemos dar error, depende de la política)
        config = Configuracion(clave=clave, valor=request.valor, descripcion=request.descripcion)
        db.add(config)
    else:
        config.valor = request.valor
        if request.descripcion:
            config.descripcion = request.descripcion
    
    db.commit()
    db.refresh(config)
    
    # Invalidar caches globales si es necesario (ej. dashboard)
    from app.redis_client import invalidate_cache
    invalidate_cache("dashboard:*")
    
    return config
