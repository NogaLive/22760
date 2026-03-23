from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from app.database import Base

class Feriado(Base):
    __tablename__ = "feriados"

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(Date, unique=True, nullable=False, index=True)
    descripcion = Column(String, nullable=False)
    tipo = Column(Enum("nacional", "institucional", name="tipo_feriado_enum"), default="institucional", nullable=False)
    registrado_por = Column(Integer, ForeignKey("docentes.dni"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
