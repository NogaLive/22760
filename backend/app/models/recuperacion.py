from sqlalchemy import Column, Date, String, Integer
from app.database import Base

class DiaRecuperacion(Base):
    __tablename__ = "dias_recuperacion"

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(Date, unique=True, index=True, nullable=False)
    descripcion = Column(String(100), nullable=True)
