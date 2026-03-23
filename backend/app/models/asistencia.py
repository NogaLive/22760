import enum

from sqlalchemy import Column, Integer, Date, Time, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class EstadoAsistencia(str, enum.Enum):
    asistencia = "asistencia"
    tardanza = "tardanza"
    inasistencia = "inasistencia"
    justificacion = "justificacion"


class Asistencia(Base):
    __tablename__ = "asistencias"
    __table_args__ = (
        UniqueConstraint("alumno_dni", "fecha", name="uq_asistencia_alumno_fecha"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    alumno_dni = Column(Integer, ForeignKey("alumnos.dni"), nullable=False)
    fecha = Column(Date, nullable=False)
    estado = Column(Enum(EstadoAsistencia), nullable=False)
    hora_registro = Column(Time, nullable=True)
    registrado_por = Column(Integer, ForeignKey("docentes.dni"), nullable=False)
    created_at = Column(Date, server_default=func.now(), nullable=False)

    # Relationships
    alumno = relationship("Alumno", back_populates="asistencias")
    registrador = relationship("Docente", back_populates="asistencias_registradas")
    modificaciones = relationship("ModificacionRegistro", back_populates="asistencia")
