from pydantic import BaseModel
from typing import Optional

class ConfiguracionBase(BaseModel):
    valor: str
    descripcion: Optional[str] = None

class ConfiguracionUpdate(ConfiguracionBase):
    pass

class ConfiguracionOut(ConfiguracionBase):
    clave: str

    class Config:
        from_attributes = True
