from pydantic import BaseModel, Field
from datetime import date, time
from typing import Optional


class RegistrarAsistenciaRequest(BaseModel):
    codigo_qr: str = Field(..., description="Código QR escaneado del alumno")
    estado: Optional[str] = Field(None, description="asistencia | tardanza | inasistencia | justificacion")


class RegistrarAsistenciaResponse(BaseModel):
    id: int
    alumno_dni: int
    alumno_nombre: str
    fecha: date
    estado: str
    hora_registro: Optional[time] = None
    mensaje: str


class AsistenciaOut(BaseModel):
    id: int
    alumno_dni: int
    alumno_nombres: str
    alumno_apellidos: str
    fecha: date
    estado: str
    hora_registro: Optional[time] = None
    registrado_por: int

    class Config:
        from_attributes = True


class ModificarAsistenciaRequest(BaseModel):
    estado: Optional[str] = None
    hora_registro: Optional[time] = None


class AsistenciaListResponse(BaseModel):
    asistencias: list[AsistenciaOut]
    total: int


class AsistenciaManualRequest(BaseModel):
    alumno_dni: int
    estado: str = Field(..., description="asistencia | tardanza | inasistencia | justificacion")
