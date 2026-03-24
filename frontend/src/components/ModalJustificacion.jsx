import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload } from 'lucide-react';
import apiClient from '../api/client';
import Swal from 'sweetalert2';

const ModalJustificacion = ({ isOpen, onClose, alumnos, onRefresh, justificacionEdit }) => {
  const [formData, setFormData] = useState({
    alumno_dni: '',
    fecha: new Date().toISOString().split('T')[0],
    tipo: 'justificacion_inasistencia',
    descripcion: ''
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (justificacionEdit) {
      setFormData({
        alumno_dni: justificacionEdit.alumno_dni,
        fecha: justificacionEdit.fecha,
        tipo: justificacionEdit.tipo,
        descripcion: justificacionEdit.descripcion
      });
    } else {
      setFormData({
        alumno_dni: '',
        fecha: new Date().toISOString().split('T')[0],
        tipo: 'justificacion_inasistencia',
        descripcion: ''
      });
    }
    setFile(null);
  }, [justificacionEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.alumno_dni && !justificacionEdit) { // Only require alumno_dni for new entries
      Swal.fire({ title: 'Atención', text: 'Debes seleccionar un alumno', icon: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const payload = new FormData();
      // Only append fields that the backend expects for each method
      if (!justificacionEdit) {
        payload.append('alumno_dni', formData.alumno_dni);
        payload.append('fecha', formData.fecha);
      } else {
        // For edit, ensure these are part of the payload if they are editable
        payload.append('alumno_dni', formData.alumno_dni); // Keep for consistency, though backend might ignore for PUT
        payload.append('fecha', formData.fecha); // Keep for consistency, though backend might ignore for PUT
      }
      payload.append('tipo', formData.tipo);
      payload.append('descripcion', formData.descripcion);
      
      if (file) {
        payload.append('archivo', file); // Corrected field name
      }

      if (justificacionEdit) {
        // Mode: Edit
        await apiClient.put(`/justificaciones/${justificacionEdit.id}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        Swal.fire({ 
          title: 'Actualizado', 
          text: 'La justificación se actualizó correctamente', 
          icon: 'success', 
          confirmButtonColor: '#27AE60' 
        }).then(() => {
          onRefresh();
          onClose();
        });
      } else {
        // Mode: New
        await apiClient.post('/justificaciones/registrar', payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        Swal.fire({ 
          title: 'Registrado', 
          text: 'La justificación se guardó correctamente', 
          icon: 'success', 
          confirmButtonColor: '#27AE60' 
        }).then(() => {
          onRefresh();
          onClose();
        });
      }
    } catch (error) {
      if (error.response?.status === 409) {
        Swal.fire({ 
          title: 'Ya existe', 
          text: 'El alumno ya tiene una justificación para este día. Puedes editarla desde la lista de justificaciones.', 
          icon: 'info',
          confirmButtonColor: '#1F4E79'
        });
      } else {
        const msg = error.response?.data?.detail || 'Error procesando justificación';
        Swal.fire({ title: 'Error', text: msg, icon: 'error', confirmButtonColor: '#1F4E79' });
      }
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          <div className="space-y-5">
            {/* Alumno Selection */}
            <div className="form-group">
                <label className="text-xs font-bold uppercase text-muted mb-2 block tracking-wider">Estudiante a Justificar</label>
                <div style={{ position: 'relative' }}>
                    <select 
                        className="form-select form-control pr-10"
                        style={{ height: '42px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
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
            </div>

            {/* Date & Type Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="form-group mb-0">
                    <label className="text-xs font-bold uppercase text-muted mb-2 block tracking-wider">Fecha</label>
                    <input 
                        type="date" 
                        className="form-control" 
                        style={{ height: '42px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                        value={formData.fecha}
                        onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                        required
                    />
                </div>
                <div className="form-group mb-0">
                    <label className="text-xs font-bold uppercase text-muted mb-2 block tracking-wider">Tipo</label>
                    <select 
                        className="form-select form-control"
                        style={{ height: '42px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
                        value={formData.tipo}
                        onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                    >
                        <option value="justificacion_inasistencia">Falta</option>
                        <option value="justificacion_tardanza">Tardanza</option>
                    </select>
                </div>
            </div>

            {/* Description */}
            <div className="form-group">
                <label className="text-xs font-bold uppercase text-muted mb-2 block tracking-wider">Motivo / Descripción</label>
                <textarea 
                    className="form-control" 
                    rows="3"
                    style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', resize: 'none', padding: '0.75rem' }}
                    value={formData.descripcion}
                    onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                    placeholder="Ej: Cita médica en EsSalud, viaje familiar reprogramado..."
                    required
                ></textarea>
            </div>

            {/* Evidence Upload */}
            <div className="form-group mb-0">
                <label className="text-xs font-bold uppercase text-muted mb-2 block tracking-wider">Evidencia (Opcional)</label>
                <label 
                    className="flex flex-col items-center justify-center gap-2 p-4 cursor-pointer transition-all border-2 border-dashed"
                    style={{ 
                        borderRadius: 'var(--radius-md)', 
                        borderColor: file ? 'var(--status-present)' : 'var(--border-color)', 
                        backgroundColor: file ? 'rgba(39, 174, 96, 0.05)' : '#F8FAFC',
                    }}
                >
                    <Upload size={24} className={file ? 'text-status-present' : 'text-muted'} />
                    <div className="text-center">
                        <span className="text-[10px] text-muted">
                            {file ? file.name : 'Formatos: JPG, PNG, PDF (Máx 5MB)'}
                        </span>
                    </div>
                    <input 
                        type="file" 
                        style={{ display: 'none' }} 
                        onChange={(e) => setFile(e.target.files[0])}
                        accept="image/*,.pdf"
                    />
                </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
            <button type="button" className="btn btn-secondary px-6" onClick={onClose} style={{ borderRadius: 'var(--radius-md)' }}>Cancelar</button>
            <button 
                type="submit" 
                className="btn btn-primary px-6 flex items-center gap-2" 
                disabled={loading} 
                style={{ 
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--status-justified)', 
                    borderColor: 'var(--status-justified)',
                    boxShadow: '0 4px 6px rgba(52, 152, 219, 0.2)'
                }}
            >
              {loading ? 'Procesando...' : 'Confirmar Justificación'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default ModalJustificacion;
