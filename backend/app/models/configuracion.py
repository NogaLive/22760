from sqlalchemy import Column, String
from app.database import Base

class Configuracion(Base):
    __tablename__ = "configuraciones"

    clave = Column(String(50), primary_key=True)
    valor = Column(String(255), nullable=False)
    descripcion = Column(String(255), nullable=True)
