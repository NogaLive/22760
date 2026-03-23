from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Alumno(Base):
    __tablename__ = "alumnos"

    dni = Column(Integer, primary_key=True, autoincrement=False)
    nombres = Column(String(100), nullable=False)
    apellidos = Column(String(100), nullable=False)
    grado_id = Column(Integer, ForeignKey("grados.id"), nullable=False)
    codigo_qr = Column(String(100), unique=True, nullable=False)
    activo = Column(Boolean, default=True, nullable=False)

    # Relationships
    grado = relationship("Grado", back_populates="alumnos")
    asistencias = relationship("Asistencia", back_populates="alumno")
    justificaciones = relationship("Justificacion", back_populates="alumno")
