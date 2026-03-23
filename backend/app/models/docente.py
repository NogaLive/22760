import enum

from sqlalchemy import Column, Integer, String, Boolean, Enum
from sqlalchemy.orm import relationship
from app.database import Base


class RolDocente(str, enum.Enum):
    director = "director"
    docente = "docente"


class Docente(Base):
    __tablename__ = "docentes"

    dni = Column(Integer, primary_key=True, autoincrement=False)
    nombres = Column(String(100), nullable=False)
    apellidos = Column(String(100), nullable=False)
    password = Column(String(6), nullable=False)
    rol = Column(Enum(RolDocente), nullable=False, default=RolDocente.docente)
    activo = Column(Boolean, default=True, nullable=False)

    # Relationships
    grados = relationship("Grado", back_populates="docente")
    asistencias_registradas = relationship("Asistencia", back_populates="registrador")
    justificaciones_registradas = relationship("Justificacion", back_populates="registrador")
    modificaciones_realizadas = relationship("ModificacionRegistro", back_populates="modificador")
