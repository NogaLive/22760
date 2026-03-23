import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import SessionLocal
from app.models.asistencia import Asistencia
from app.models.alumno import Alumno

db = SessionLocal()
faltas = db.query(Asistencia).all()
print(f"Total asistencias en DB: {len(faltas)}")
for f in faltas[-5:]:
    print(f"DNI: {f.alumno_dni}, Fecha: {f.fecha}, Estado: {f.estado}")

alumnos = db.query(Alumno).filter(Alumno.activo==True).limit(2).all()
print(f"Alumnos encontrados: {[a.dni for a in alumnos]}")
