import sys
import os
from datetime import timedelta, time

# Config path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.alumno import Alumno
from app.models.asistencia import Asistencia, EstadoAsistencia
from app.utils.timezone import get_peru_today

def seed_desercion():
    db = SessionLocal()
    try:
        # Get couple of active students
        alumnos = db.query(Alumno).filter(Alumno.activo == True).limit(2).all()
        if not alumnos:
            print("No hay alumnos activos para generar desercion.")
            return

        hoy = get_peru_today()
        hora_registro = time(8, 0) # 8:00 AM
        
        # Alumno 1: Riesgo Alto (Inasistencias continuas recientes)
        alumno_alto = alumnos[0]
        print(f"Generando Riesgo Alto para: {alumno_alto.nombres} {alumno_alto.apellidos} ({alumno_alto.dni})")
        # Generate 4 consecutive absences ending yesterday/today
        for i in range(1, 5):
            fecha_falta = hoy - timedelta(days=i)
            # Check if record exists
            existing = db.query(Asistencia).filter(
                Asistencia.alumno_dni == alumno_alto.dni,
                Asistencia.fecha == fecha_falta
            ).first()
            if not existing:
                falta = Asistencia(
                    alumno_dni=alumno_alto.dni,
                    fecha=fecha_falta,
                    hora_registro=hora_registro,
                    estado=EstadoAsistencia.inasistencia,
                    registrado_por=10101010 # Admin doc
                )
                db.add(falta)
            else:
                existing.estado = EstadoAsistencia.inasistencia

        # Alumno 2: Riesgo Moderado (Varias inasistencias en el mes pero no consecutivas extremas)
        if len(alumnos) > 1:
            alumno_mod = alumnos[1]
            print(f"Generando Riesgo Moderado para: {alumno_mod.nombres} {alumno_mod.apellidos} ({alumno_mod.dni})")
            dias_falta = [2, 5, 8, 12, 15] # Random days ago
            for d in dias_falta:
                fecha_falta = hoy - timedelta(days=d)
                existing = db.query(Asistencia).filter(
                    Asistencia.alumno_dni == alumno_mod.dni,
                    Asistencia.fecha == fecha_falta
                ).first()
                if not existing:
                    falta = Asistencia(
                        alumno_dni=alumno_mod.dni,
                        fecha=fecha_falta,
                        hora_registro=hora_registro,
                        estado=EstadoAsistencia.inasistencia,
                        registrado_por=10101010
                    )
                    db.add(falta)
                else:
                    existing.estado = EstadoAsistencia.inasistencia

        db.commit()
        print("¡Datos de deserción generados exitosamente!")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_desercion()
