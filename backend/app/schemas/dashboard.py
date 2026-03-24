from pydantic import BaseModel
from typing import Optional


class DashboardKPIs(BaseModel):
    total_alumnos: int
    asistencias: float
    tardanzas: float
    inasistencias: float
    justificaciones_tardanza: float
    justificaciones_inasistencia: float
    porcentaje_asistencia: float
    porcentaje_tardanza: float
    porcentaje_inasistencia: float
    porcentaje_justificacion: float


class DashboardChartData(BaseModel):
    labels: list[str]
    asistencias: list[int]
    tardanzas: list[int]
    inasistencias: list[int]
    justificaciones: list[int]


class DashboardResponse(BaseModel):
    kpis: DashboardKPIs
    chart_data: DashboardChartData
    filtro: str
    grado_id: Optional[int] = None
    grado_nombre: Optional[str] = None

class RiesgoDesercionItem(BaseModel):
    alumno_dni: int
    nombres: str
    apellidos: str
    grado_nombre: str
    inasistencias_consecutivas: int
    inasistencias_mes: int
    nivel_riesgo: str # "Alto" o "Medio"

class RiesgoDesercionResponse(BaseModel):
    riesgos: list[RiesgoDesercionItem]
