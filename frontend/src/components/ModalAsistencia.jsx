import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import apiClient from '../api/client';
import Swal from 'sweetalert2';
import { useAuth } from '../hooks/useAuth';

const ModalAsistencia = ({ isOpen, onClose, alumnoDni, asistenciasHoy, onRefresh }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    asistencia_id: null,
    estado: 'asistencia'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && alumnoDni && asistenciasHoy) {
      const record = asistenciasHoy.find(a => a.alumno_dni === alumnoDni);
      if (record) {
        setFormData({
          asistencia_id: record.id,
          estado: record.estado
        });
      }
    }
  }, [isOpen, alumnoDni, asistenciasHoy]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.asistencia_id) {
      Swal.fire({ title: 'Error', text: 'No hay registro de asistencia activo para modificar.', icon: 'error' });
      return;
    }

    setLoading(true);
    try {
      await apiClient.put(`/asistencia/${formData.asistencia_id}`, {
        estado: formData.estado
      });

      Swal.fire({ title: 'Modificado', text: 'El registro ha sido actualizado', icon: 'success', confirmButtonColor: '#27AE60' });
      onRefresh();
      onClose();
    } catch (error) {
      const msg = error.response?.data?.detail || 'Error modificando asistencia';
      Swal.fire({ title: 'Error', text: msg, icon: 'error', confirmButtonColor: '#1F4E79' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div 
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(18, 49, 79, 0.5)', backdropFilter: 'blur(4px)' }} 
        onClick={onClose}
      />
      <div className="card animate-fade-in" style={{ position: 'relative', width: '100%', maxWidth: '400px', margin: '1rem', padding: '0', overflow: 'hidden' }}>
        
        <div className="flex justify-between items-center" style={{ padding: '1.25rem 1.5rem', backgroundColor: '#FFF5F5', borderBottom: '1px solid #FED7D7' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} color="#E53E3E" />
            <h2 className="font-heading m-0 text-lg" style={{ color: '#C53030' }}>Modificar Asistencia</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {user?.rol !== 'director' ? (
            <div className="text-center py-4">
              <p className="text-muted">Solo la Dirección puede modificar registros ya consolidados.</p>
              <button className="btn btn-secondary mt-4 w-full" onClick={onClose}>Cerrar</button>
            </div>
          ) : !formData.asistencia_id ? (
            <div className="text-center py-4">
              <p className="text-muted">El alumno seleccionado no tiene marcado ningún estado hoy para poder ser modificado.</p>
              <button className="btn btn-secondary mt-4 w-full" onClick={onClose}>Cerrar</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group mb-4">
                <label className="form-label">DNI Alumno</label>
                <input type="text" className="form-control" value={alumnoDni} disabled />
              </div>

              <div className="form-group mb-6">
                <label className="form-label">Nuevo Estado</label>
                <select 
                  className="form-select form-control"
                  value={formData.estado}
                  onChange={(e) => setFormData({...formData, estado: e.target.value})}
                >
                  <option value="asistencia">Presente</option>
                  <option value="tardanza">Tardanza</option>
                  <option value="inasistencia">Falta (Inasistencia)</option>
                </select>
                <p className="text-sm mt-2" style={{ color: '#E53E3E' }}>
                  * Esta acción quedará registrada en el historial de auditoría.
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ backgroundColor: '#E53E3E', borderColor: '#E53E3E' }}>
                  {loading ? 'Aplicando...' : 'Confirmar Cambio'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalAsistencia;
