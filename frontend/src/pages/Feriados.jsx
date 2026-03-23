import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../hooks/useAuth';
import Swal from 'sweetalert2';
import { Calendar, Trash2, Plus, Info, Settings, Flag, CheckCircle } from 'lucide-react';

const Feriados = () => {
  const { user } = useAuth();
  
  // States
  const [feriados, setFeriados] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [inicioEscolar, setInicioEscolar] = useState(null);
  const [finEscolar, setFinEscolar] = useState(null);

  // Form State para Feriados
  const [fecha, setFecha] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState('institucional');

  // Form State para Configuración
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const fetchFeriados = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/feriados');
      
      const allData = res.data;
      
      // Separar los límites escolares de los feriados regulares
      const regulares = allData.filter(f => f.tipo !== 'inicio_escolar' && f.tipo !== 'fin_escolar');
      const inicio = allData.find(f => f.tipo === 'inicio_escolar');
      const fin = allData.find(f => f.tipo === 'fin_escolar');

      setFeriados(regulares);
      setInicioEscolar(inicio);
      setFinEscolar(fin);
      
      if (inicio) setFechaInicio(inicio.fecha);
      if (fin) setFechaFin(fin.fecha);
      
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudieron cargar los feriados.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeriados();
  }, []);

  const handleAddFeriado = async (e) => {
    e.preventDefault();
    if (!fecha || !descripcion) {
      Swal.fire('Atención', 'Debes completar fecha y descripción.', 'warning');
      return;
    }

    try {
      await apiClient.post('/feriados', {
        fecha,
        descripcion,
        tipo
      });
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Feriado Registrado',
        showConfirmButton: false,
        timer: 1500
      });
      setFecha('');
      setDescripcion('');
      fetchFeriados();
    } catch (error) {
      const msg = error.response?.data?.detail || 'Error al registrar feriado.';
      Swal.fire('Error', msg, 'error');
    }
  };

  const handleUpdateConfig = async (tipoConf, valorFecha, desc) => {
    if (!valorFecha) {
      Swal.fire('Atención', 'Debes seleccionar una fecha.', 'warning');
      return;
    }

    try {
      // Intentar borrar la configuracion actual si existiera para este tipo (simplificando actualizacion)
      const confActual = tipoConf === 'inicio_escolar' ? inicioEscolar : finEscolar;
      
      if (confActual) {
         await apiClient.delete(`/feriados/${confActual.fecha}`);
      }

      await apiClient.post('/feriados', {
        fecha: valorFecha,
        descripcion: desc,
        tipo: tipoConf
      });

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Configuración Guardada',
        showConfirmButton: false,
        timer: 1500
      });
      
      fetchFeriados();
    } catch (error) {
      const msg = error.response?.data?.detail || 'Error al actualizar configuración.';
      Swal.fire('Error', msg, 'error');
    }
  };

  const handleDelete = async (fechaFeriado) => {
    if (user?.rol !== 'director') return;
    
    const result = await Swal.fire({
      title: '¿Eliminar feriado?',
      text: `Se habilitará el registro de asistencias para el ${fechaFeriado}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'var(--status-absent)',
      cancelButtonColor: 'var(--text-muted)'
    });

    if (result.isConfirmed) {
      try {
        await apiClient.delete(`/feriados/${fechaFeriado}`);
        Swal.fire('Eliminado', 'Feriado eliminado.', 'success');
        fetchFeriados();
      } catch (error) {
        Swal.fire('Error', 'No se pudo eliminar.', 'error');
      }
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-heading text-primary">Calendario y Configuración</h1>
          <p className="text-muted text-sm">
            Gestiona los límites del año académico y los días inactivos (feriados).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Controles Administrativos */}
        {user?.rol === 'director' && (
          <div className="md:col-span-1 space-y-6">
            
            {/* Configuración del Año Escolar */}
            <div className="card h-fit">
              <h2 className="font-heading text-lg mb-4 flex items-center gap-2 text-primary">
                <Settings size={20} />
                Límites Académicos
              </h2>
              
              <div className="space-y-4">
                <div className="form-group mb-0">
                  <label className="form-label text-sm text-gray-700">📌 Inicio del Año Escolar</label>
                  <div className="flex gap-2">
                    <input 
                      type="date" 
                      className="form-control text-sm"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                    />
                    <button 
                      className="btn btn-primary"
                      style={{ padding: '0.5rem' }}
                      onClick={() => handleUpdateConfig('inicio_escolar', fechaInicio, 'Inicio Año Escolar')}
                      title="Guardar Inicio Escolar"
                    >
                      <CheckCircle size={18} />
                    </button>
                  </div>
                </div>

                <div className="form-group mb-0">
                  <label className="form-label text-sm text-gray-700">🏁 Fin del Año Escolar</label>
                  <div className="flex gap-2">
                    <input 
                      type="date" 
                      className="form-control text-sm"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                    />
                    <button 
                      className="btn btn-primary"
                      style={{ padding: '0.5rem' }}
                      onClick={() => handleUpdateConfig('fin_escolar', fechaFin, 'Fin Año Escolar')}
                      title="Guardar Fin Escolar"
                    >
                      <CheckCircle size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Nuevo Feriado Form */}
            <div className="card h-fit">
              <h2 className="font-heading text-lg mb-4 flex items-center gap-2 text-primary">
                <Plus size={20} />
                Nuevo Feriado
              </h2>
              <form onSubmit={handleAddFeriado} className="space-y-4">
                <div className="form-group mb-0">
                  <label className="form-label text-sm">Día a bloquear</label>
                  <input 
                    type="date" 
                    className="form-control text-sm"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-sm">Motivo exacto</label>
                  <input 
                    type="text" 
                    className="form-control text-sm" 
                    placeholder="Ej: Día del Maestro..."
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    maxLength={100}
                    required
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-sm">Clasificación</label>
                  <select className="form-control text-sm" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                    <option value="institucional">Institucional (Solo colegio)</option>
                    <option value="nacional">Nacional (País)</option>
                  </select>
                </div>
                
                <button type="submit" className="btn btn-primary w-full mt-2">
                  <Calendar size={18} /> Registrar Bloqueo
                </button>
              </form>
            </div>

          </div>
        )}

        {/* Lista de Feriados */}
        <div className={`card p-0 overflow-hidden ${user?.rol !== 'director' ? 'md:col-span-3' : 'md:col-span-2'}`}>
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <Calendar size={20} className="text-gray-500" />
            <h2 className="font-heading text-base m-0 text-primary">Fechas Bloqueadas</h2>
          </div>
          
          <div className="overflow-x-auto" style={{ maxHeight: '600px' }}>
            <table className="w-full text-left text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead className="bg-gray-50 text-gray-500 border-b sticky top-0" style={{ boxShadow: '0 1px 0 var(--border-color)' }}>
                <tr>
                  <th className="p-4 font-semibold text-xs uppercase tracking-wider">Fecha</th>
                  <th className="p-4 font-semibold text-xs uppercase tracking-wider">Motivo</th>
                  <th className="p-4 font-semibold text-xs uppercase tracking-wider">Tipo</th>
                  {user?.rol === 'director' && <th className="p-4 font-semibold text-xs uppercase tracking-wider text-center">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-muted">Cargando fechas...</td>
                  </tr>
                ) : feriados.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-muted">
                      <div className="flex flex-col items-center justify-center">
                        <Flag size={32} className="mb-2 opacity-50" />
                        <p>El calendario escolar se encuentra limpio.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  feriados.map((feriado) => (
                    <tr key={feriado.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-bold" style={{ color: 'var(--primary)' }}>
                        {feriado.fecha}
                      </td>
                      <td className="p-4 text-gray-700 font-medium">{feriado.descripcion}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          feriado.tipo === 'nacional' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {feriado.tipo.toUpperCase()}
                        </span>
                      </td>
                      {user?.rol === 'director' && (
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => handleDelete(feriado.fecha)}
                            className="p-2 text-status-absent hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar feriado"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Feriados;
