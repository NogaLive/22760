import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import apiClient from '../api/client';
import Swal from 'sweetalert2';

const ModalAlumno = ({ isOpen, onClose, gradoId, alumnoEdit = null, onRefresh }) => {
  const [formData, setFormData] = useState({
    dni: '',
    nombres: '',
    apellidos: '',
    activo: true
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (alumnoEdit) {
      setFormData({
        dni: alumnoEdit.dni.toString(),
        nombres: alumnoEdit.nombres,
        apellidos: alumnoEdit.apellidos,
        activo: alumnoEdit.activo
      });
    } else {
      setFormData({ dni: '', nombres: '', apellidos: '', activo: true });
    }
  }, [alumnoEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        nombres: formData.nombres,
        apellidos: formData.apellidos,
        activo: formData.activo,
        grado_id: parseInt(gradoId, 10)
      };

      if (alumnoEdit) {
        // Edit mode
        await apiClient.put(`/alumnos/${alumnoEdit.dni}`, payload);
        Swal.fire({ title: 'Actualizado', text: 'Alumno actualizado exitosamente', icon: 'success', confirmButtonColor: '#27AE60' });
      } else {
        // Create mode
        payload.dni = parseInt(formData.dni, 10);
        await apiClient.post(`/alumnos`, payload);
        Swal.fire({ title: 'Creado', text: 'Alumno registrado con éxito', icon: 'success', confirmButtonColor: '#27AE60' });
      }
      
      onRefresh();
      onClose();
    } catch (error) {
      const msg = error.response?.data?.detail || 'Error al procesar la solicitud';
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
          <h2 className="font-heading text-primary m-0 text-lg">{alumnoEdit ? 'Editar Alumno' : 'Registrar Nuevo Alumno'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">DNI del Alumno</label>
            <input 
              type="number" 
              className="form-control" 
              value={formData.dni}
              onChange={(e) => setFormData({...formData, dni: e.target.value})}
              disabled={!!alumnoEdit} // Cannot edit DNI once created
              required
              maxLength={8}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group mb-0">
              <label className="form-label">Nombres</label>
              <input 
                type="text" 
                className="form-control" 
                value={formData.nombres}
                onChange={(e) => setFormData({...formData, nombres: e.target.value})}
                required
              />
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Apellidos</label>
              <input 
                type="text" 
                className="form-control" 
                value={formData.apellidos}
                onChange={(e) => setFormData({...formData, apellidos: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : (alumnoEdit ? 'Guardar Cambios' : 'Registrar Alumno')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default ModalAlumno;
