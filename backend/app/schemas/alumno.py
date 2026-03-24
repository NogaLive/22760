from pydantic import BaseModel, Field
from typing import Optional


class CrearAlumnoRequest(BaseModel):
    dni: int = Field(..., description="DNI del alumno (hasta 9 dígitos)")
    nombres: str = Field(..., min_length=1, max_length=100)
    apellidos: str = Field(..., min_length=1, max_length=100)
    grado_id: int = Field(..., ge=1, le=9)


class ActualizarAlumnoRequest(BaseModel):
    dni: Optional[int] = None
    nombres: Optional[str] = Field(None, min_length=1, max_length=100)
    apellidos: Optional[str] = Field(None, min_length=1, max_length=100)


class AlumnoOut(BaseModel):
    dni: int
    nombres: str
    apellidos: str
    grado_id: int
    grado_nombre: str = ""
    codigo_qr: str
    activo: bool

    class Config:
        from_attributes = True


class AlumnoListResponse(BaseModel):
    alumnos: list[AlumnoOut]
    total: int
