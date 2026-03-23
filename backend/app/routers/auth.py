from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.auth import LoginRequest, LoginResponse
from app.services.auth_service import authenticate_docente

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Login con DNI y contraseña de 6 dígitos."""
    return authenticate_docente(db, request.dni, request.password)
