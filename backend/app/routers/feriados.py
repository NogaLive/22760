from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from app.database import get_db
from app.models.feriado import Feriado
from app.models.docente import Docente
from app.schemas.feriado import FeriadoCreate, FeriadoOut
from app.middleware.auth_middleware import get_current_user, require_director

router = APIRouter(prefix="/api/feriados", tags=["Feriados"])

@router.get("/", response_model=List[FeriadoOut])
def listar_feriados(db: Session = Depends(get_db), current_user: Docente = Depends(get_current_user)):
    """Listar todos los feriados ordenados por fecha."""
    feriados = db.query(Feriado).order_by(Feriado.fecha.asc()).all()
    return feriados

@router.post("/", response_model=FeriadoOut, status_code=status.HTTP_201_CREATED)
def crear_feriado(
    feriado_in: FeriadoCreate,
    db: Session = Depends(get_db),
    director: Docente = Depends(require_director)
):
    """Crear un nuevo feriado (Solo Directores)."""
    # Ver si ya existe
    existe = db.query(Feriado).filter(Feriado.fecha == feriado_in.fecha).first()
    if existe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un feriado registrado para la fecha {feriado_in.fecha}."
        )

    nuevo_feriado = Feriado(
        fecha=feriado_in.fecha,
        descripcion=feriado_in.descripcion,
        tipo=feriado_in.tipo,
        registrado_por=director.dni
    )
    db.add(nuevo_feriado)
    db.commit()
    db.refresh(nuevo_feriado)
    return nuevo_feriado

@router.delete("/{fecha}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_feriado(
    fecha: date,
    db: Session = Depends(get_db),
    director: Docente = Depends(require_director)
):
    """Eliminar un feriado (Solo Directores)."""
    feriado = db.query(Feriado).filter(Feriado.fecha == fecha).first()
    if not feriado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feriado no encontrado."
        )

    db.delete(feriado)
    db.commit()
    return None
