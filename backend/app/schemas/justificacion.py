from pydantic import BaseModel, Field
from datetime import date
from typing import Optional


class CrearJustificacionRequest(BaseModel):
    alumno_dni: int
    fecha: date = Field(..., description="No puede ser posterior a hoy")
    tipo: str = Field(..., description="justificacion_tardanza | justificacion_inasistencia")
    descripcion: str = Field(..., min_length=1)


class JustificacionOut(BaseModel):
    id: int
    alumno_dni: int
    alumno_nombres: str
    alumno_apellidos: str
    fecha: date
    tipo: str
    descripcion: str
    archivo_url: Optional[str] = None
    archivo_nombre: Optional[str] = None
    registrado_por: int

    class Config:
        from_attributes = True


class JustificacionListResponse(BaseModel):
    justificaciones: list[JustificacionOut]
    total: int
