from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.docente import Docente
from app.models.grado import Grado
from app.middleware.auth_middleware import create_access_token
from app.schemas.auth import LoginResponse, DocenteInfo, GradoInfo


def authenticate_docente(db: Session, dni: int, password: str) -> LoginResponse:
    """Authenticate docente by DNI and plain 6-digit password."""
    docente = db.query(Docente).filter(Docente.dni == dni).first()

    if not docente:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="DNI o contraseña incorrectos",
        )

    if not docente.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario inactivo",
        )

    # Plain text password comparison (6-digit static passwords)
    if docente.password != password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="DNI o contraseña incorrectos",
        )

    # Get assigned grados
    grados = db.query(Grado).filter(Grado.docente_dni == docente.dni).all()

    # If director, get ALL grados
    if docente.rol.value == "director":
        grados = db.query(Grado).order_by(Grado.id).all()

    # Create JWT
    token = create_access_token({"dni": docente.dni, "rol": docente.rol.value})

    grados_info = [
        GradoInfo(id=g.id, nombre=g.nombre, nivel=g.nivel.value)
        for g in grados
    ]

    return LoginResponse(
        access_token=token,
        docente=DocenteInfo(
            dni=docente.dni,
            nombres=docente.nombres,
            apellidos=docente.apellidos,
            rol=docente.rol.value,
            grados=grados_info,
        ),
    )
