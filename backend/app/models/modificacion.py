from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy import DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class ModificacionRegistro(Base):
    __tablename__ = "modificaciones_registro"

    id = Column(Integer, primary_key=True, autoincrement=True)
    asistencia_id = Column(Integer, ForeignKey("asistencias.id"), nullable=False)
    campo_modificado = Column(String(50), nullable=False)
    valor_anterior = Column(String(100), nullable=False)
    valor_nuevo = Column(String(100), nullable=False)
    modificado_por = Column(Integer, ForeignKey("docentes.dni"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    asistencia = relationship("Asistencia", back_populates="modificaciones")
    modificador = relationship("Docente", back_populates="modificaciones_realizadas")
