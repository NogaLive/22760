import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../hooks/useAuth';
import Swal from 'sweetalert2';
import { Calendar, Trash2, Plus, Info, Settings, Flag, CheckCircle, Clock } from 'lucide-react';

const Feriados = () => {
  const { user } = useAuth();

  // States
  const [feriados, setFeriados] = useState([]);
  const [recuperaciones, setRecuperaciones] = useState([]);
  const [loading, setLoading] = useState(false);

  const [inicioEscolar, setInicioEscolar] = useState(null);
  const [finEscolar, setFinEscolar] = useState(null);

  // Form State para Feriados
  const [fecha, setFecha] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState('institucional');

  // Form State para Recuperaciones
  const [fechaRecup, setFechaRecup] = useState('');
  const [descRecup, setDescRecup] = useState('');

  // Form State para Configuración
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // Form State para Horarios
  const [horarios, setHorarios] = useState({
    hora_entrada_inicial: '07:30:00',
    hora_asistencia_inicial: '08:15:00',
    hora_tardanza_inicial: '09:00:00',
    hora_entrada_primaria: '07:30:00',
    hora_asistencia_primaria: '08:00:00',
    hora_tardanza_primaria: '09:00:00',
  });

  const fetchFeriados = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/feriados');

      const allData = res.data;
      // Filter out any academic boundaries that might be in the feriados list (legacy)
      const regulares = allData.filter(f => f.tipo !== 'inicio_escolar' && f.tipo !== 'fin_escolar');
      setFeriados(regulares);
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudieron cargar los feriados.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecuperaciones = async () => {
    try {
      const res = await apiClient.get('/recuperaciones');
      setRecuperaciones(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchHorarios = async () => {
    try {
      const res = await apiClient.get('/configuracion');
      const data = res.data;
      const newHorarios = { ...horarios };
      data.forEach(c => {
        if (newHorarios.hasOwnProperty(c.clave)) {
          newHorarios[c.clave] = c.valor;
        }
        if (c.clave === 'inicio_escolar') {
            setFechaInicio(c.valor);
            setInicioEscolar({ fecha: c.valor });
        }
        if (c.clave === 'fin_escolar') {
            setFechaFin(c.valor);
            setFinEscolar({ fecha: c.valor });
        }
      });
      setHorarios(newHorarios);
    } catch (error) {
      console.error("Error al cargar horarios", error);
    }
  };

  useEffect(() => {
    fetchFeriados();
    fetchRecuperaciones();
    fetchHorarios();
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
      await apiClient.put(`/configuracion/${tipoConf}`, { 
        valor: valorFecha,
        descripcion: desc 
      });

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Configuración Guardada',
        showConfirmButton: false,
        timer: 1500
      });

      fetchHorarios();
    } catch (error) {
      const msg = error.response?.data?.detail || 'Error al actualizar configuración.';
      Swal.fire('Error', msg, 'error');
    }
  };

  const handleAddRecuperacion = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/recuperaciones', {
        fecha: fechaRecup,
        descripcion: descRecup
      });
      Swal.fire('Éxito', 'Día de recuperación programado.', 'success');
      setFechaRecup('');
      setDescRecup('');
      fetchRecuperaciones();
    } catch (error) {
      Swal.fire('Error', error.response?.data?.detail || 'No se pudo programar.', 'error');
    }
  };

  const handleDeleteRecuperacion = async (id) => {
    const res = await Swal.fire({
      title: '¿Eliminar recuperación?',
      text: 'El día volverá a estar bloqueado si es fin de semana.',
      icon: 'warning',
      showCancelButton: true
    });
    if (res.isConfirmed) {
      try {
        await apiClient.delete(`/recuperaciones/${id}`);
        Swal.fire('Eliminado', 'Recuperación eliminada.', 'success');
        fetchRecuperaciones();
      } catch (error) {
        Swal.fire('Error', error.response?.data?.detail || 'No se pudo eliminar.', 'error');
      }
    }
  };

  const handleUpdateHorario = async (clave, valor) => {
    try {
      await apiClient.put(`/configuracion/${clave}`, { valor });
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Horario Actualizado',
        showConfirmButton: false,
        timer: 1500
      });
      fetchHorarios();
    } catch (error) {
      Swal.fire('Error', 'No se pudo actualizar el horario.', 'error');
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
          <div className="md:col-span-3 space-y-6">

            {/* 1. Configuración Global (Límites + Horarios) */}
            <div className="card mb-6">
              <div className="flex items-center gap-2 mb-6 border-b pb-2">
                <Settings size={20} className="text-primary" />
                <h2 className="font-heading text-lg m-0">Configuración Global Académica</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Columna A: Límites del Año */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase text-muted mb-4 flex items-center gap-2">
                    <Flag size={14} /> Límites del Año
                  </h3>
                  <div className="space-y-4">
                    <div className="form-group mb-0">
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">📌 Inicio Escolar</label>
                      <div className="flex gap-2">
                        <input type="date" className="form-control text-sm py-1 h-8" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
                        <button className="btn btn-primary p-1 px-2 h-8" onClick={() => handleUpdateConfig('inicio_escolar', fechaInicio, 'Inicio Año Escolar')}><CheckCircle size={16} /></button>
                      </div>
                    </div>
                    <div className="form-group mb-0">
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">🏁 Fin Escolar</label>
                      <div className="flex gap-2">
                        <input type="date" className="form-control text-sm py-1 h-8" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
                        <button className="btn btn-primary p-1 px-2 h-8" onClick={() => handleUpdateConfig('fin_escolar', fechaFin, 'Fin Año Escolar')}><CheckCircle size={16} /></button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Columna B: Inicial */}
                <div className="space-y-4 border-l pl-4 md:pl-8 border-gray-100">
                  <h3 className="text-xs font-bold uppercase text-blue-600 mb-4 flex items-center gap-2">
                    <Clock size={14} /> Nivel Inicial
                  </h3>
                  <div className="space-y-3">
                    {['entrada', 'asistencia', 'tardanza'].map((key) => (
                      <div key={key} className="form-group mb-0">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-tighter">
                          {key === 'entrada' ? 'Habilitar Escáner' : key === 'asistencia' ? 'Inicio Tardanza' : 'Inicio Falta'}
                        </label>
                        <div className="flex gap-2">
                          <input type="time" step="1" className="form-control text-sm py-1 h-8" value={horarios[`hora_${key}_inicial`]} onChange={(e) => setHorarios({ ...horarios, [`hora_${key}_inicial`]: e.target.value })} />
                          <button className="btn btn-secondary p-1 px-2 h-8" onClick={() => handleUpdateHorario(`hora_${key}_inicial`, horarios[`hora_${key}_inicial`])}>OK</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Columna C: Primaria */}
                <div className="space-y-4 border-l pl-4 md:pl-8 border-gray-100">
                  <h3 className="text-xs font-bold uppercase text-orange-600 mb-4 flex items-center gap-2">
                    <Clock size={14} /> Nivel Primaria
                  </h3>
                  <div className="space-y-3">
                    {['entrada', 'asistencia', 'tardanza'].map((key) => (
                      <div key={key} className="form-group mb-0">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-tighter">
                          {key === 'entrada' ? 'Habilitar Escáner' : key === 'asistencia' ? 'Inicio Tardanza' : 'Inicio Falta'}
                        </label>
                        <div className="flex gap-2">
                          <input type="time" step="1" className="form-control text-sm py-1 h-8" value={horarios[`hora_${key}_primaria`]} onChange={(e) => setHorarios({ ...horarios, [`hora_${key}_primaria`]: e.target.value })} />
                          <button className="btn btn-secondary p-1 px-2 h-8" onClick={() => handleUpdateHorario(`hora_${key}_primaria`, horarios[`hora_${key}_primaria`])}>OK</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Gestión de Fechas (Formularios Compactos) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card">
                <h2 className="font-heading text-base mb-4 flex items-center gap-2 text-primary">
                  <Plus size={18} /> Nuevo Bloqueo (Feriado)
                </h2>
                <form onSubmit={handleAddFeriado} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input type="date" className="form-control text-xs" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
                  <select className="form-control text-xs" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                    <option value="institucional">Institucional</option>
                    <option value="nacional">Nacional</option>
                  </select>
                  <input type="text" className="form-control text-xs sm:col-span-2" placeholder="Motivo exacto..." value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required />
                  <button type="submit" className="btn btn-primary w-full sm:col-span-2 py-1 text-xs">Registrar Feriado</button>
                </form>
              </div>

              <div className="card border-l-4 border-l-green-500">
                <h2 className="font-heading text-base mb-4 flex items-center gap-2 text-green-700">
                  <CheckCircle size={18} /> Activar Recuperación
                </h2>
                <form onSubmit={handleAddRecuperacion} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input type="date" className="form-control text-xs" value={fechaRecup} onChange={(e) => setFechaRecup(e.target.value)} required />
                  <div className="hidden sm:block"></div>
                  <input type="text" className="form-control text-xs sm:col-span-2" placeholder="Motivo (ej: Sábado Recuperativo)" value={descRecup} onChange={(e) => setDescRecup(e.target.value)} required />
                  <button type="submit" className="btn btn-primary w-full bg-green-600 hover:bg-green-700 border-none sm:col-span-2 py-1 text-xs">
                    Habilitar Sábado
                  </button>
                </form>
              </div>
            </div>

          </div>
        )}

        {/* Lista de Feriados y Recuperaciones */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:col-span-3">

          <div className="card p-0 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <Calendar size={20} className="text-gray-500" />
              <h2 className="font-heading text-base m-0 text-primary">Fechas Bloqueadas (Feriados)</h2>
            </div>

            <div className="overflow-x-auto" style={{ maxHeight: '400px' }}>
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
                      <td colSpan="4" className="p-8 text-center text-muted">No hay feriados registrados.</td>
                    </tr>
                  ) : (
                    feriados.map((feriado) => (
                      <tr key={feriado.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-bold" style={{ color: 'var(--primary)' }}>{feriado.fecha}</td>
                        <td className="p-4 text-gray-700 font-medium">{feriado.descripcion}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${feriado.tipo === 'nacional' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                            {feriado.tipo.toUpperCase()}
                          </span>
                        </td>
                        {user?.rol === 'director' && (
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleDelete(feriado.fecha)}
                              className="p-2 text-status-absent hover:bg-red-50 rounded-lg transition-colors"
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

          <div className="card p-0 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-green-50 flex items-center gap-2">
              <CheckCircle size={20} className="text-green-600" />
              <h2 className="font-heading text-base m-0 text-green-800">Días Especiales Activos (Recuperaciones)</h2>
            </div>

            <div className="overflow-x-auto" style={{ maxHeight: '400px' }}>
              <table className="w-full text-left text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead className="bg-green-50 text-green-700 border-b sticky top-0" style={{ boxShadow: '0 1px 0 #E2E8F0' }}>
                  <tr>
                    <th className="p-4 font-semibold text-xs uppercase tracking-wider">Fecha</th>
                    <th className="p-4 font-semibold text-xs uppercase tracking-wider">Motivo</th>
                    {user?.rol === 'director' && <th className="p-4 font-semibold text-xs uppercase tracking-wider text-center">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {recuperaciones.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="p-8 text-center text-muted italic">No hay sábados de recuperación programados.</td>
                    </tr>
                  ) : (
                    recuperaciones.map((r) => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-green-50/30 transition-colors">
                        <td className="p-4 font-bold text-green-700">{r.fecha}</td>
                        <td className="p-4 text-gray-700 font-medium">{r.descripcion}</td>
                        {user?.rol === 'director' && (
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleDeleteRecuperacion(r.id)}
                              className="p-2 text-status-absent hover:bg-red-50 rounded-lg transition-colors"
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
    </div>
  );
};

export default Feriados;
