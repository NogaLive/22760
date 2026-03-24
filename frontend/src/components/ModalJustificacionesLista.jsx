import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Download, Clock, AlertCircle, Edit3 } from 'lucide-react';
import apiClient from '../api/client';
import Swal from 'sweetalert2';

const ModalJustificacionesLista = ({ isOpen, onClose, gradoId, onEdit }) => {
  const [justificaciones, setJustificaciones] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && gradoId) {
      fetchJustificaciones();
    }
  }, [isOpen, gradoId]);

  const fetchJustificaciones = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/justificaciones/grado/${gradoId}`);
      setJustificaciones(response.data.justificaciones || []);
    } catch (err) {
      console.error(err);
      Swal.fire({ title: 'Error', text: 'No se pudieron cargar las justificaciones', icon: 'error' });
    } finally {
      setLoading(false);
      setTimeout(() => setLoading(false), 300); // Visual feedback
    }
  };

  const handleDownload = async (url, filename) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed", error);
      // Fallback
      window.open(url, '_blank');
    }
  };

  const handleEditInternal = (j) => {
    // When editing from inside the list, we notify the parent
    // The parent (DashboardGrado) should:
    // 1. Close this modal (ModalJustificacionesLista)
    // 2. Open ModalJustificacion with the data
    onEdit(j);
  };

  const handleExportar = async () => {
    try {
      Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, title: 'Generando archivo...', icon: 'info' });
      const baseUrlFull = apiClient.defaults.baseURL || window.location.origin;
      const rootUrl = baseUrlFull.endsWith('/api') ? baseUrlFull.slice(0, -4) : baseUrlFull;
      const response = await apiClient.get(`/exportar/justificaciones/grado/${gradoId}?base_url=${encodeURIComponent(rootUrl)}`, { responseType: 'blob' });
      
      const blob = new Blob([response.data], { type: 'application/vnd.officedocument.spreadsheetml.sheet' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `justificaciones_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo exportar el archivo Excel', 'error');
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div 
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(18, 49, 79, 0.5)', backdropFilter: 'blur(4px)' }} 
        onClick={onClose}
      />
      <div className="card animate-fade-in" style={{ position: 'relative', width: '100%', maxWidth: '700px', margin: '1rem', padding: '0', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
        
        <div className="flex justify-between items-center" style={{ padding: '1.25rem 1.5rem', backgroundColor: '#fff', borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <div style={{ backgroundColor: 'rgba(31, 78, 121, 0.1)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
                <FileText size={22} color="var(--primary)" />
            </div>
            <div>
                <h2 className="font-heading text-primary m-0 text-lg leading-tight">Registro de Justificaciones</h2>
                <p className="text-[10px] text-muted uppercase font-bold tracking-widest m-0">Grado: {gradoId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, backgroundColor: '#F8FAFC' }}>
          {loading ? (
            <div className="text-center py-12">
                <div className="animate-spin inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
                <p className="text-muted">Obteniendo registros...</p>
            </div>
          ) : justificaciones.length === 0 ? (
            <div className="text-center py-12 text-muted">
              <AlertCircle size={48} className="mx-auto mb-4" color="#CBD5E1" />
              <p className="font-medium text-secondary">No hay justificaciones registradas</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {justificaciones.map(j => (
                <div key={j.id} className="card p-5 group hover:border-primary/30 transition-all border-none" style={{ backgroundColor: 'white', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-primary m-0 text-md">{j.alumno_apellidos}, {j.alumno_nombres}</h4>
                        <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-muted font-mono">{j.alumno_dni}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted">
                        <div className="flex items-center gap-1">
                            <Clock size={12} />
                            <span>{new Date(j.fecha).toLocaleDateString()}</span>
                        </div>
                        <div className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${j.tipo === 'justificacion_inasistencia' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                          {j.tipo === 'justificacion_inasistencia' ? 'Falta' : 'Tardanza'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                         <button 
                            onClick={() => handleEditInternal(j)}
                            className="btn btn-secondary flex items-center gap-1.5 text-[10px] font-bold uppercase transition-all hover:bg-primary hover:text-white"
                            style={{ padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)' }}
                        >
                            <Edit3 size={12} /> Editar
                        </button>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0' }}>
                    <p className="m-0 text-sm italic text-secondary leading-relaxed">"{j.descripcion}"</p>
                  </div>

                  {j.archivo_url && (
                    <div className="mt-4 flex justify-end">
                      <button 
                        onClick={() => handleDownload(
                          j.archivo_url.startsWith('http') ? j.archivo_url : `${apiClient.defaults.baseURL.replace('/api', '')}${j.archivo_url}`,
                          j.archivo_nombre || `evidencia_${j.alumno_dni}.png`
                        )}
                        className="btn btn-primary flex items-center gap-2 text-[10px] font-bold"
                        style={{ padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)' }}
                      >
                        <Download size={12} /> Descargar Evidencia
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div style={{ padding: '1.25rem 1.5rem', backgroundColor: 'white', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <button 
                className="btn btn-secondary flex-1 flex justify-center items-center gap-2 text-sm font-semibold hover:bg-gray-50" 
                onClick={handleExportar} 
                disabled={loading || justificaciones.length === 0} 
                style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
            >
                <Download size={18} /> Exportar Reporte Excel
            </button>
            <button 
                className="btn btn-primary flex-1 font-semibold shadow-lg" 
                onClick={onClose}
                style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)' }}
            >
                Cerrar Panel
            </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ModalJustificacionesLista;
