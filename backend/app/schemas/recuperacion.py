from pydantic import BaseModel
from datetime import date
from typing import Optional

class DiaRecuperacionBase(BaseModel):
    fecha: date
    descripcion: Optional[str] = None

class DiaRecuperacionCreate(DiaRecuperacionBase):
    pass

class DiaRecuperacionOut(DiaRecuperacionBase):
    id: int

    class Config:
        from_attributes = True
