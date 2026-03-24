from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.docente import Docente
from app.services.export_service import exportar_asistencias_excel
from app.utils.timezone import get_peru_today

router = APIRouter(prefix="/api/exportar", tags=["Exportar"])


@router.get("/grado/{grado_id}")
def exportar_asistencia_grado(
    grado_id: int,
    db: Session = Depends(get_db),
    current_user: Docente = Depends(get_current_user),
):
    """
    Exporta la asistencia de un grado en formato Excel.
    El docente solo puede exportar sus grados asignados. El director puede exportar cualquier grado.
    """
    
    # Validation if Teacher has access to this grade
    if current_user.rol.value == "docente":
        autorizado = any(g.id == grado_id for g in current_user.grados)
        if not autorizado:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para exportar datos de este grado.",
            )
            
    try:
        excel_file, grado_nombre = exportar_asistencias_excel(db, grado_id)
        
        filename = f"asistencia_{grado_nombre.replace(' ', '_')}_{get_peru_today().strftime('%Y%m%d')}.xlsx"

        return StreamingResponse(
            excel_file,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar el archivo Excel: {e}",
        )


@router.get("/general")
def exportar_asistencia_general(
    periodo: Optional[str] = "hoy",
    db: Session = Depends(get_db),
    current_user: Docente = Depends(get_current_user),
):
    """
    Exporta la asistencia de los grados asignados al docente (o todos si es director)
    en formato Excel. Genera un archivo con múltiples hojas, una por grado.
    """
    grado_ids = None
    if current_user.rol.value == "docente":
        grado_ids = [g.id for g in current_user.grados]
        if not grado_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene grados asignados para exportar.",
            )
            
    try:
        from app.services.dashboard_service import _get_date_range
        fecha_inicio, fecha_fin = _get_date_range(db, periodo)
        
        from app.services.export_service import generar_excel_general
        excel_file, _ = generar_excel_general(db, grado_ids, fecha_inicio, fecha_fin)
        
        filename = f"asistencia_general_{get_peru_today().strftime('%Y%m%d')}.xlsx"

        return StreamingResponse(
            excel_file,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar el archivo Excel general: {e}",
        )

@router.get("/justificaciones/grado/{grado_id}")
def exportar_justificaciones_grado(
    grado_id: int,
    tipo: str | None = None,
    base_url: str | None = None,
    db: Session = Depends(get_db),
    current_user: Docente = Depends(get_current_user),
):
    """
    Exporta las justificaciones de un grado en formato Excel con links de descarga.
    """
    if current_user.rol.value == "docente":
        autorizado = any(g.id == grado_id for g in current_user.grados)
        if not autorizado:
            raise HTTPException(status_code=403, detail="No tiene permisos para este grado.")
            
    try:
        from app.services.export_service import generar_excel_justificaciones
        excel_file, grado_nombre = generar_excel_justificaciones(db, grado_id, tipo, base_url)
        
        filename = f"justificaciones_{grado_nombre.replace(' ', '_')}_{get_peru_today().strftime('%Y%m%d')}.xlsx"

        return StreamingResponse(
            excel_file,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
