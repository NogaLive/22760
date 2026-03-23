import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload } from 'lucide-react';
import apiClient from '../api/client';
import Swal from 'sweetalert2';

const ModalJustificacion = ({ isOpen, onClose, alumnos, onRefresh }) => {
  const [formData, setFormData] = useState({
    alumno_dni: '',
    fecha: new Date().toISOString().split('T')[0],
    tipo: 'justificacion_inasistencia',
    descripcion: ''
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.alumno_dni) {
      Swal.fire({ title: 'Atención', text: 'Debes seleccionar un alumno', icon: 'warning' });
      return;
    }

    setLoading(true);
    try {
      // Use FormData logic because endpoint expects multipart/form-data
      const payload = new FormData();
      payload.append('alumno_dni', formData.alumno_dni);
      payload.append('fecha', formData.fecha);
      payload.append('tipo', formData.tipo);
      payload.append('descripcion', formData.descripcion);
      if (file) {
        payload.append('file', file);
      }

      await apiClient.post('/justificaciones', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      Swal.fire({ title: 'Justificado', text: 'La justificación se procesó correctamente', icon: 'success', confirmButtonColor: '#27AE60' });
      onRefresh();
      onClose();
    } catch (error) {
      const msg = error.response?.data?.detail || 'Error procesando justificación';
      Swal.fire({ title: 'Error', text: msg, icon: 'error', confirmButtonColor: '#1F4E79' });
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div 
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(18, 49, 79, 0.5)', backdropFilter: 'blur(4px)' }} 
        onClick={onClose}
      />
      <div className="card animate-fade-in" style={{ position: 'relative', width: '100%', maxWidth: '500px', margin: '1rem', padding: '0', overflow: 'hidden' }}>
        
        <div className="flex justify-between items-center" style={{ padding: '1.25rem 1.5rem', backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-color)' }}>
          <h2 className="font-heading text-primary m-0 text-lg">Registrar Justificación</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          
          <div className="form-group">
            <label className="form-label">Alumno</label>
            <select 
              className="form-select form-control"
              value={formData.alumno_dni}
              onChange={(e) => setFormData({...formData, alumno_dni: e.target.value})}
              required
            >
              <option value="">-- Seleccionar Alumno --</option>
              {alumnos.map(a => (
                <option key={a.dni} value={a.dni}>{a.apellidos}, {a.nombres} ({a.dni})</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group mb-0">
              <label className="form-label">Fecha a Justificar</label>
              <input 
                type="date" 
                className="form-control" 
                value={formData.fecha}
                onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                required
              />
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Tipo</label>
              <select 
                className="form-select form-control"
                value={formData.tipo}
                onChange={(e) => setFormData({...formData, tipo: e.target.value})}
              >
                <option value="justificacion_inasistencia">Inasistencia</option>
                <option value="justificacion_tardanza">Tardanza</option>
              </select>
            </div>
          </div>

          <div className="form-group mt-4">
            <label className="form-label">Descripción</label>
            <textarea 
              className="form-control" 
              rows="3"
              value={formData.descripcion}
              onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
              placeholder="Motivo de la justificación (ej. Cita médica)"
              required
            ></textarea>
          </div>

          <div className="form-group mb-0">
            <label className="form-label">Evidencia (Opcional)</label>
            <label className="flex items-center justify-center gap-2 form-control cursor-pointer" style={{ borderStyle: 'dashed', backgroundColor: '#F8FAFC' }}>
              <Upload size={18} color="var(--text-muted)" />
              <span className="text-sm text-muted">
                {file ? file.name : 'Subir archivo o foto'}
              </span>
              <input 
                type="file" 
                style={{ display: 'none' }} 
                onChange={(e) => setFile(e.target.files[0])}
                accept="image/*,.pdf"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ backgroundColor: 'var(--status-justified)', borderColor: 'var(--status-justified)' }}>
              {loading ? 'Enviando...' : 'Guardar Justificación'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default ModalJustificacion;
