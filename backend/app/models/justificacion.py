import enum

from sqlalchemy import Column, Integer, String, Date, Text, Enum, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class TipoJustificacion(str, enum.Enum):
    justificacion_tardanza = "justificacion_tardanza"
    justificacion_inasistencia = "justificacion_inasistencia"


class Justificacion(Base):
    __tablename__ = "justificaciones"

    id = Column(Integer, primary_key=True, autoincrement=True)
    alumno_dni = Column(Integer, ForeignKey("alumnos.dni"), nullable=False)
    fecha = Column(Date, nullable=False)
    tipo = Column(Enum(TipoJustificacion), nullable=False)
    descripcion = Column(Text, nullable=False)
    archivo_url = Column(String(500), nullable=True)
    archivo_nombre = Column(String(255), nullable=True)
    registrado_por = Column(Integer, ForeignKey("docentes.dni"), nullable=False)
    created_at = Column(Date, server_default=func.now(), nullable=False)

    # Relationships
    alumno = relationship("Alumno", back_populates="justificaciones")
    registrador = relationship("Docente", back_populates="justificaciones_registradas")
