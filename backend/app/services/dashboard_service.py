from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.asistencia import Asistencia, EstadoAsistencia
from app.models.alumno import Alumno
from app.models.justificacion import Justificacion, TipoJustificacion
from app.models.grado import Grado
from app.schemas.dashboard import DashboardKPIs, DashboardChartData, DashboardResponse, RiesgoDesercionItem, RiesgoDesercionResponse
from app.redis_client import get_cached, set_cached
from app.models.configuracion import Configuracion
from app.models.feriado import Feriado
from app.utils.timezone import get_peru_today


def _get_date_range(db: Session, filtro: str) -> tuple[date, date]:
    """Get date range based on filter type."""
    hoy = get_peru_today()
    if filtro == "hoy":
        return hoy, hoy
    elif filtro == "semana":
        inicio = hoy - timedelta(days=hoy.weekday())  # Monday
        return inicio, hoy
    elif filtro == "mes":
        inicio = hoy.replace(day=1)
        return inicio, hoy
    elif filtro == "año":
        # Aligned with school year Configuration (stored as Global Configs now)
        inicio_escolar = db.query(Configuracion).filter(Configuracion.clave == "inicio_escolar").first()
        fin_escolar = db.query(Configuracion).filter(Configuracion.clave == "fin_escolar").first()
        
        # Parse dates from strings in Configuracion
        from datetime import date as dt_date
        try:
            inicio = dt_date.fromisoformat(inicio_escolar.valor) if inicio_escolar else hoy.replace(month=3, day=1)
        except:
            inicio = hoy.replace(month=3, day=1)
            
        try:
            fin = dt_date.fromisoformat(fin_escolar.valor) if fin_escolar else hoy.replace(month=12, day=20)
        except:
            fin = hoy.replace(month=12, day=20)
            
        return inicio, fin
    else:
        return hoy, hoy


def _calculate_kpis(
    db: Session,
    fecha_inicio: date,
    fecha_fin: date,
    grado_ids: list[int] | None = None,
) -> DashboardKPIs:
    """Calculate KPI values using optimized single GROUP BY queries instead of multiple counts."""
    # Group Asistencia by estado
    asist_q = db.query(Asistencia.estado, func.count(Asistencia.id)).join(
        Alumno, Asistencia.alumno_dni == Alumno.dni
    ).filter(
        Asistencia.fecha >= fecha_inicio,
        Asistencia.fecha <= fecha_fin,
        Alumno.activo == True,
    )

    if grado_ids:
        asist_q = asist_q.filter(
            Alumno.grado_id.in_(grado_ids)
        )

    estado_counts = dict(asist_q.group_by(Asistencia.estado).all())
    
    asistencias = estado_counts.get(EstadoAsistencia.asistencia, 0)
    tardanzas = estado_counts.get(EstadoAsistencia.tardanza, 0)
    inasistencias = estado_counts.get(EstadoAsistencia.inasistencia, 0)
    justificaciones_count = estado_counts.get(EstadoAsistencia.justificacion, 0)
    total_registros = sum(estado_counts.values())

    # Group Justificacion by tipo
    just_q = db.query(Justificacion.tipo, func.count(Justificacion.id)).join(
        Alumno, Justificacion.alumno_dni == Alumno.dni
    ).filter(
        Justificacion.fecha >= fecha_inicio,
        Justificacion.fecha <= fecha_fin,
        Alumno.activo == True,
    )
    if grado_ids:
        just_q = just_q.filter(
            Alumno.grado_id.in_(grado_ids)
        )

    tipo_counts = dict(just_q.group_by(Justificacion.tipo).all())
    just_tardanza = tipo_counts.get(TipoJustificacion.justificacion_tardanza, 0)
    just_inasistencia = tipo_counts.get(TipoJustificacion.justificacion_inasistencia, 0)

    # Total alumnos activos
    alumnos_query = db.query(func.count(Alumno.dni)).filter(Alumno.activo == True)
    if grado_ids:
        alumnos_query = alumnos_query.filter(Alumno.grado_id.in_(grado_ids))
    total_alumnos = alumnos_query.scalar() or 0

    # Percentages
    total = total_registros if total_registros > 0 else 1
    porcentaje_asistencia = round((asistencias / total) * 100, 1)
    porcentaje_tardanza = round((tardanzas / total) * 100, 1)
    porcentaje_inasistencia = round((inasistencias / total) * 100, 1)
    porcentaje_justificacion = round((justificaciones_count / total) * 100, 1)

    # Averages logic: if more than 1 day, return averages
    hoy = get_peru_today()
    # For averages, we only count days that have actually passed (up to hoy)
    # to avoid future 0s from skewing the average.
    efectiva_fin = min(fecha_fin, hoy)
    num_dias = (efectiva_fin - fecha_inicio).days + 1
    
    # We only divide if it's a multi-day filter and num_dias > 1
    if num_dias > 1:
        asistencias = round(asistencias / num_dias, 1)
        tardanzas = round(tardanzas / num_dias, 1)
        inasistencias = round(inasistencias / num_dias, 1)
        just_tardanza = round(just_tardanza / num_dias, 1)
        just_inasistencia = round(just_inasistencia / num_dias, 1)

    return DashboardKPIs(
        total_alumnos=total_alumnos,
        asistencias=asistencias,
        tardanzas=tardanzas,
        inasistencias=inasistencias,
        justificaciones_tardanza=just_tardanza,
        justificaciones_inasistencia=just_inasistencia,
        porcentaje_asistencia=porcentaje_asistencia,
        porcentaje_tardanza=porcentaje_tardanza,
        porcentaje_inasistencia=porcentaje_inasistencia,
        porcentaje_justificacion=porcentaje_justificacion,
    )


def _calculate_chart_data(
    db: Session,
    fecha_inicio: date,
    fecha_fin: date,
    grado_id: int | None = None,
    grado_ids: list[int] | None = None,
) -> DashboardChartData:
    """Calculate chart data using O(1) bulk fetch and memory grouping for immense speedups."""
    from collections import defaultdict

    base_q = db.query(Asistencia).join(Alumno, Asistencia.alumno_dni == Alumno.dni).filter(
        Asistencia.fecha >= fecha_inicio,
        Asistencia.fecha <= fecha_fin,
        Alumno.activo == True,
    )

    if grado_id:
        # Per-grade dashboard
        asistencias_records = base_q.filter(Alumno.grado_id == grado_id).all()
        
        # Agrupar en memoria por fecha y estado
        # map: date -> estado -> count
        agrupado = defaultdict(lambda: defaultdict(int))
        for rec in asistencias_records:
            agrupado[rec.fecha][rec.estado] += 1

        labels = []
        asistencias_arr = []
        tardanzas_arr = []
        inasistencias_arr = []
        justificaciones_arr = []

        current = fecha_inicio
        while current <= fecha_fin:
            labels.append(current.strftime("%d/%m"))
            dia_datos = agrupado.get(current, {})
            
            asistencias_arr.append(dia_datos.get(EstadoAsistencia.asistencia, 0))
            tardanzas_arr.append(dia_datos.get(EstadoAsistencia.tardanza, 0))
            inasistencias_arr.append(dia_datos.get(EstadoAsistencia.inasistencia, 0))
            justificaciones_arr.append(dia_datos.get(EstadoAsistencia.justificacion, 0))
            
            current += timedelta(days=1)

        return DashboardChartData(
            labels=labels,
            asistencias=asistencias_arr,
            tardanzas=tardanzas_arr,
            inasistencias=inasistencias_arr,
            justificaciones=justificaciones_arr,
        )

    else:
        # General dashboard: group by grado
        if grado_ids:
            grados = db.query(Grado).filter(Grado.id.in_(grado_ids)).order_by(Grado.id).all()
            base_q = base_q.filter(Alumno.grado_id.in_(grado_ids))
        else:
            grados = db.query(Grado).order_by(Grado.id).all()
            
        asistencias_records = base_q.with_entities(Alumno.grado_id, Asistencia.estado).all()
        
        # Agrupar en memoria por grado_id y estado
        agrupado = defaultdict(lambda: defaultdict(int))
        for grado_id_rec, estado in asistencias_records:
            agrupado[grado_id_rec][estado] += 1

        labels = [g.nombre for g in grados]
        asistencias_arr = []
        tardanzas_arr = []
        inasistencias_arr = []
        justificaciones_arr = []

        for g in grados:
            g_datos = agrupado.get(g.id, {})
            asistencias_arr.append(g_datos.get(EstadoAsistencia.asistencia, 0))
            tardanzas_arr.append(g_datos.get(EstadoAsistencia.tardanza, 0))
            inasistencias_arr.append(g_datos.get(EstadoAsistencia.inasistencia, 0))
            justificaciones_arr.append(g_datos.get(EstadoAsistencia.justificacion, 0))

        return DashboardChartData(
            labels=labels,
            asistencias=asistencias_arr,
            tardanzas=tardanzas_arr,
            inasistencias=inasistencias_arr,
            justificaciones=justificaciones_arr,
        )


def get_dashboard_general(
    db: Session,
    filtro: str = "hoy",
    grado_ids: list[int] | None = None,
) -> DashboardResponse:
    """Get general dashboard KPIs and chart data, optionally filtered to specific grados."""
    cache_key = f"dashboard:general:{filtro}:{grado_ids}"
    cached = get_cached(cache_key)
    if cached:
        return DashboardResponse(**cached)

    fecha_inicio, fecha_fin = _get_date_range(db, filtro)
    kpis = _calculate_kpis(db, fecha_inicio, fecha_fin, grado_ids=grado_ids)
    chart_data = _calculate_chart_data(db, fecha_inicio, fecha_fin, grado_ids=grado_ids)

    response = DashboardResponse(
        kpis=kpis,
        chart_data=chart_data,
        filtro=filtro,
    )

    set_cached(cache_key, response.model_dump())
    return response


def get_dashboard_grado(
    db: Session,
    grado_id: int,
    filtro: str = "hoy",
) -> DashboardResponse:
    """Get dashboard KPIs and chart data for a specific grado."""
    cache_key = f"dashboard:grado:{grado_id}:{filtro}"
    cached = get_cached(cache_key)
    if cached:
        return DashboardResponse(**cached)

    # Get grado name
    grado = db.query(Grado).filter(Grado.id == grado_id).first()
    grado_nombre = grado.nombre if grado else "Desconocido"

    fecha_inicio, fecha_fin = _get_date_range(db, filtro)
    kpis = _calculate_kpis(db, fecha_inicio, fecha_fin, grado_ids=[grado_id])
    chart_data = _calculate_chart_data(db, fecha_inicio, fecha_fin, grado_id=grado_id)

    response = DashboardResponse(
        kpis=kpis,
        chart_data=chart_data,
        filtro=filtro,
        grado_id=grado_id,
        grado_nombre=grado_nombre,
    )

    set_cached(cache_key, response.model_dump())
    return response

def get_riesgo_desercion(
    db: Session,
    grado_ids: list[int] | None = None,
) -> RiesgoDesercionResponse:
    """Calcula el riesgo de deserción por inasistencias acumuladas y consecutivas (Super Fetching version O(1))."""
    cache_key = f"dashboard:riesgo_desercion:{grado_ids}"
    cached = get_cached(cache_key)
    if cached:
        return RiesgoDesercionResponse(**cached)

    hoy = get_peru_today()
    inicio_mes = hoy - timedelta(days=30)

    
    # Query alumnos con sus grados
    alumnos_q = db.query(Alumno, Grado.nombre).join(Grado, Alumno.grado_id == Grado.id).filter(Alumno.activo == True)
    if grado_ids:
        alumnos_q = alumnos_q.filter(Alumno.grado_id.in_(grado_ids))
    alumnos_data = alumnos_q.all()

    if not alumnos_data:
        return RiesgoDesercionResponse(riesgos=[])
        
    dnis = [a.Alumno.dni for a in alumnos_data]

    # Bulk fetch todas las asistencias de los ultimos 30 dias ordenados por desc
    asist_recs = db.query(Asistencia).filter(
        Asistencia.alumno_dni.in_(dnis),
        Asistencia.fecha >= inicio_mes,
        Asistencia.fecha <= hoy
    ).order_by(Asistencia.fecha.desc()).all()
    
    # Agrupar en memoria
    from collections import defaultdict
    asistencias_por_alumno = defaultdict(list)
    for ar in asist_recs:
        asistencias_por_alumno[ar.alumno_dni].append(ar)
        
    riesgos = []
    
    for alumno_obj, grado_nombre in alumnos_data:
        asistencias = asistencias_por_alumno.get(alumno_obj.dni, [])
        inasistencias_mes = sum(1 for a in asistencias if a.estado == EstadoAsistencia.inasistencia)
        
        consecutivas = 0
        for a in asistencias:
            if a.estado == EstadoAsistencia.inasistencia:
                consecutivas += 1
            elif a.estado in (EstadoAsistencia.asistencia, EstadoAsistencia.tardanza):
                break
                
        nivel_riesgo = None
        if consecutivas >= 3 or inasistencias_mes >= 5:
            nivel_riesgo = "Alto"
        elif consecutivas >= 2 or inasistencias_mes >= 3:
            nivel_riesgo = "Moderado"
            
        if nivel_riesgo:
            riesgos.append(
                RiesgoDesercionItem(
                    alumno_dni=alumno_obj.dni,
                    nombres=alumno_obj.nombres,
                    apellidos=alumno_obj.apellidos,
                    grado_nombre=grado_nombre,
                    inasistencias_consecutivas=consecutivas,
                    inasistencias_mes=inasistencias_mes,
                    nivel_riesgo=nivel_riesgo
                )
            )
            
    # Sort by risk level (Alto first) and then by consecutive absences
    riesgos.sort(key=lambda x: (1 if x.nivel_riesgo == "Alto" else 2, -x.inasistencias_consecutivas))
    
    response = RiesgoDesercionResponse(riesgos=riesgos)
    set_cached(cache_key, response.model_dump(), ttl=300) # cache for 5 minutes
    
    return response
