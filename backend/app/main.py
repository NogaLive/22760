from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.database import engine, Base
from app.models import *  # noqa: F401, F403 - Import all models so Base.metadata knows about them
from app.routers import auth, asistencia, alumnos, justificacion, dashboard, exportar, feriados, configuracion, recuperacion


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    # Seed default configurations
    from sqlalchemy.orm import Session
    from app.database import SessionLocal
    from app.models.configuracion import Configuracion
    
    db = SessionLocal()
    try:
        defaults = [
            ("hora_entrada_inicial", "07:30:00", "Inicio de Escaneo (Inicial)"),
            ("hora_asistencia_inicial", "08:15:00", "Inicio de Tardanza (Inicial)"),
            ("hora_tardanza_inicial", "09:00:00", "Inicio de Falta (Inicial)"),
            ("hora_entrada_primaria", "07:30:00", "Inicio de Escaneo (Primaria)"),
            ("hora_asistencia_primaria", "08:00:00", "Inicio de Tardanza (Primaria)"),
            ("hora_tardanza_primaria", "09:00:00", "Inicio de Falta (Primaria)"),
        ]
        for clave, valor, desc in defaults:
            exists = db.query(Configuracion).filter(Configuracion.clave == clave).first()
            if not exists:
                db.add(Configuracion(clave=clave, valor=valor, descripcion=desc))
        db.commit()
    finally:
        db.close()
        
    yield
    # Shutdown: cleanup if needed


app = FastAPI(
    title="Sistema de Control de Asistencia - I.E N°22760",
    description="API para el control de asistencia estudiantil mediante escaneo de código QR",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory for serving justification files
uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Include routers
app.include_router(auth.router)
app.include_router(asistencia.router)
app.include_router(alumnos.router)
app.include_router(justificacion.router)
app.include_router(dashboard.router)
app.include_router(exportar.router)
app.include_router(feriados.router)
app.include_router(configuracion.router)
app.include_router(recuperacion.router)


@app.get("/", tags=["Root"])
def root():
    return {
        "sistema": "Control de Asistencia",
        "institucion": "I.E N°22760",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}
