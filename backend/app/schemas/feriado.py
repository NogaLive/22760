from pydantic import BaseModel, Field
from datetime import date
from typing import Optional

class FeriadoBase(BaseModel):
    fecha: date = Field(..., description="Fecha del feriado (YYYY-MM-DD)")
    descripcion: str = Field(..., max_length=100, description="Razón del feriado (Ej: Día de la Madre, Paro, etc.)")
    tipo: Optional[str] = Field("institucional", description="Tipo de feriado: nacional o institucional")

class FeriadoCreate(FeriadoBase):
    pass

class FeriadoOut(FeriadoBase):
    id: int
    registrado_por: int
    
    class Config:
        from_attributes = True
