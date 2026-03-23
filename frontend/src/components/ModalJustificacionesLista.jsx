import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Download, Clock, AlertCircle } from 'lucide-react';
import apiClient from '../api/client';
import Swal from 'sweetalert2';

const ModalJustificacionesLista = ({ isOpen, onClose, gradoId }) => {
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
      // API returns { justificaciones: [...], total: X }
      setJustificaciones(response.data.justificaciones || []);
    } catch (error) {
      console.error(error);
      Swal.fire({ title: 'Error', text: 'No se pudieron cargar las justificaciones', icon: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div 
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(18, 49, 79, 0.5)', backdropFilter: 'blur(4px)' }} 
        onClick={onClose}
      />
      <div className="card animate-fade-in" style={{ position: 'relative', width: '100%', maxWidth: '700px', margin: '1rem', padding: '0', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        
        <div className="flex justify-between items-center" style={{ padding: '1.25rem 1.5rem', backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <FileText size={20} color="var(--primary)" />
            <h2 className="font-heading text-primary m-0 text-lg">Registro de Justificaciones</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, backgroundColor: '#F8FAFC' }}>
          {loading ? (
            <div className="text-center py-8 text-muted">Cargando justificaciones...</div>
          ) : justificaciones.length === 0 ? (
            <div className="text-center py-8 text-muted">
              <AlertCircle size={48} className="mx-auto mb-4" color="#CBD5E1" />
              <p>No hay justificaciones registradas en este grado.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {justificaciones.map(j => (
                <div key={j.id} className="card p-4" style={{ backgroundColor: 'white', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-primary m-0">{j.alumno_apellidos}, {j.alumno_nombres}</h4>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted">
                        <Clock size={14} />
                        <span>Fecha justificada: <strong>{new Date(j.fecha).toLocaleDateString()}</strong></span>
                      </div>
                    </div>
                    <span className={`badge ${j.tipo === 'justificacion_inasistencia' ? 'badge-absent' : 'badge-late'}`}>
                      {j.tipo === 'justificacion_inasistencia' ? 'Falta' : 'Tardanza'}
                    </span>
                  </div>
                  
                  <div className="mt-3 p-3 rounded bg-gray-50" style={{ backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0' }}>
                    <p className="m-0 text-sm text-secondary">{j.descripcion}</p>
                  </div>

                  {j.archivo_url && (
                    <div className="mt-4 flex justify-end">
                      <a 
                        href={`${apiClient.defaults.baseURL.replace('/api', '')}${j.archivo_url}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="btn btn-secondary flex items-center gap-2 text-sm"
                        style={{ padding: '0.25rem 0.75rem' }}
                      >
                        <Download size={14} /> Ver Evidencia
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div style={{ padding: '1rem 1.5rem', backgroundColor: 'white', borderTop: '1px solid var(--border-color)', textAlign: 'right' }}>
            <button className="btn btn-primary" onClick={onClose}>Cerrar Panel</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ModalJustificacionesLista;
