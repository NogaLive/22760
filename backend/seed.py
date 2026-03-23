"""
Seed script: populates the database with test data.

Usage:
    cd backend
    python seed.py

Data created:
    - 1 Director
    - 3 Docentes
    - 9 Grados (3 años - 6to Primaria)
    - 5 Alumnos per grado (45 total)
    - Sample attendance records for today
"""

import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(__file__))

from datetime import date, time
from app.database import engine, Base, SessionLocal
from app.models.docente import Docente, RolDocente
from app.models.grado import Grado, NivelGrado
from app.models.alumno import Alumno
from app.models.asistencia import Asistencia, EstadoAsistencia
from app.services.qr_service import generate_qr_token


def seed():
    # Create tables
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(Docente).first():
            print("La base de datos ya tiene datos. Omitiendo seed.")
            print("Para reiniciar, elimine las tablas manualmente y ejecute de nuevo.")
            return

        print("Creando datos de prueba...")

        # ── Docentes ──────────────────────────────────────────
        director = Docente(
            dni=12345678,
            nombres="Carlos",
            apellidos="Mendoza Ríos",
            password="123456",
            rol=RolDocente.director,
            activo=True,
        )

        docentes = [
            Docente(
                dni=22334455,
                nombres="María",
                apellidos="García López",
                password="234567",
                rol=RolDocente.docente,
                activo=True,
            ),
            Docente(
                dni=33445566,
                nombres="José",
                apellidos="Rodríguez Pérez",
                password="345678",
                rol=RolDocente.docente,
                activo=True,
            ),
            Docente(
                dni=44556677,
                nombres="Ana",
                apellidos="Torres Vargas",
                password="456789",
                rol=RolDocente.docente,
                activo=True,
            ),
        ]

        db.add(director)
        db.add_all(docentes)
        db.flush()

        print(f"  ✓ Director: {director.nombres} {director.apellidos} (DNI: {director.dni}, pass: {director.password})")
        for d in docentes:
            print(f"  ✓ Docente: {d.nombres} {d.apellidos} (DNI: {d.dni}, pass: {d.password})")

        # ── Grados ────────────────────────────────────────────
        grados_data = [
            ("3 años", NivelGrado.inicial, docentes[0].dni),
            ("4 años", NivelGrado.inicial, docentes[0].dni),
            ("5 años", NivelGrado.inicial, docentes[1].dni),
            ("1ero Primaria", NivelGrado.primaria, docentes[1].dni),
            ("2do Primaria", NivelGrado.primaria, docentes[1].dni),
            ("3ero Primaria", NivelGrado.primaria, docentes[2].dni),
            ("4to Primaria", NivelGrado.primaria, docentes[2].dni),
            ("5to Primaria", NivelGrado.primaria, docentes[2].dni),
            ("6to Primaria", NivelGrado.primaria, docentes[2].dni),
        ]

        grados = []
        for nombre, nivel, docente_dni in grados_data:
            grado = Grado(nombre=nombre, nivel=nivel, docente_dni=docente_dni)
            db.add(grado)
            grados.append(grado)

        db.flush()

        for g in grados:
            print(f"  ✓ Grado: {g.nombre} ({g.nivel.value}) - Docente DNI: {g.docente_dni}")

        # ── Alumnos (5 por grado) ─────────────────────────────
        nombres_alumnos = [
            ("Pedro", "Sánchez Flores"),
            ("Lucía", "Martínez Díaz"),
            ("Diego", "Hernández Cruz"),
            ("Valentina", "Gómez Ruiz"),
            ("Sebastián", "López Morales"),
        ]

        base_dni = 70000001
        all_alumnos = []

        for grado in grados:
            for i, (nombre, apellido) in enumerate(nombres_alumnos):
                alumno_dni = base_dni
                base_dni += 1

                alumno = Alumno(
                    dni=alumno_dni,
                    nombres=nombre,
                    apellidos=apellido,
                    grado_id=grado.id,
                    codigo_qr=generate_qr_token(),
                    activo=True,
                )
                db.add(alumno)
                all_alumnos.append(alumno)

        db.flush()
        print(f"  ✓ {len(all_alumnos)} alumnos creados (5 por grado)")

        # ── Asistencias de hoy ────────────────────────────────
        hoy = date.today()
        estados = [
            EstadoAsistencia.asistencia,
            EstadoAsistencia.asistencia,
            EstadoAsistencia.tardanza,
            EstadoAsistencia.asistencia,
            EstadoAsistencia.inasistencia,
        ]

        count_asistencias = 0
        for grado in grados:
            alumnos_grado = [a for a in all_alumnos if a.grado_id == grado.id]
            for j, alumno in enumerate(alumnos_grado):
                estado = estados[j % len(estados)]
                hora = time(7, 30 + j * 5) if estado != EstadoAsistencia.inasistencia else None

                asistencia = Asistencia(
                    alumno_dni=alumno.dni,
                    fecha=hoy,
                    estado=estado,
                    hora_registro=hora,
                    registrado_por=grado.docente_dni,
                )
                db.add(asistencia)
                count_asistencias += 1

        db.flush()
        print(f"  ✓ {count_asistencias} registros de asistencia para hoy ({hoy})")

        db.commit()
        print("\n✅ Seed completado exitosamente!")
        print("\n── Credenciales de acceso ──")
        print(f"  Director:  DNI={director.dni}  Password={director.password}")
        for d in docentes:
            print(f"  Docente:   DNI={d.dni}  Password={d.password}")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Error durante el seed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
