from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    dni: int = Field(..., description="DNI del docente (hasta 9 dígitos)")
    password: str = Field(..., min_length=6, max_length=6, description="Contraseña de 6 dígitos")


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    docente: "DocenteInfo"


class DocenteInfo(BaseModel):
    dni: int
    nombres: str
    apellidos: str
    rol: str
    grados: list["GradoInfo"]

    class Config:
        from_attributes = True


class GradoInfo(BaseModel):
    id: int
    nombre: str
    nivel: str

    class Config:
        from_attributes = True


class TokenPayload(BaseModel):
    dni: int
    rol: str
    exp: int
