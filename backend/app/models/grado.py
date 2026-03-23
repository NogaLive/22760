import enum

from sqlalchemy import Column, Integer, String, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class NivelGrado(str, enum.Enum):
    inicial = "inicial"
    primaria = "primaria"


class Grado(Base):
    __tablename__ = "grados"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(50), nullable=False, unique=True)
    nivel = Column(Enum(NivelGrado), nullable=False)
    docente_dni = Column(Integer, ForeignKey("docentes.dni"), nullable=True)

    # Relationships
    docente = relationship("Docente", back_populates="grados")
    alumnos = relationship("Alumno", back_populates="grado")
