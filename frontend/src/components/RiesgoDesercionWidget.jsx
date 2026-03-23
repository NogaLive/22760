import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { AlertTriangle, Info } from 'lucide-react';
import { RiesgoDesercionSkeleton } from './Skeletons';

const RiesgoDesercionWidget = ({ gradoId }) => {
  const [riesgos, setRiesgos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRiesgos = async () => {
      try {
        const url = '/dashboard/riesgo-desercion';
        const config = gradoId ? { params: { grado_id: gradoId } } : {};
        const res = await apiClient.get(url, config);
        setRiesgos(res.data.riesgos || []);
      } catch (error) {
        console.error("Error fetching riesgo desercion:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRiesgos();
  }, [gradoId]);

  if (loading) {
    return <RiesgoDesercionSkeleton />;
  }

  if (riesgos.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 text-green-700">
        <Info size={20} />
        <span className="text-sm font-medium">No hay alumnos con riesgo de deserción detectado en los últimos 30 días.</span>
      </div>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden">
      <div className="bg-red-100 border-b border-red-200 p-3 flex items-center gap-2">
        <AlertTriangle size={20} className="text-red-600" />
        <h3 className="text-red-800 font-bold m-0 text-sm uppercase tracking-wide">
          Alerta de Deserción Escolar ({riesgos.length})
        </h3>
      </div>
      
      <div className="max-h-60 overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-red-50 text-red-700 sticky top-0 shadow-sm">
            <tr>
              <th className="p-2 pl-4 font-semibold">Alumno</th>
              <th className="p-2 font-semibold">Grado</th>
              <th className="p-2 text-center font-semibold text-xs">Faltas (Mes)</th>
              <th className="p-2 text-center font-semibold text-xs">Faltas Consecutivas</th>
              <th className="p-2 font-semibold">Riesgo</th>
            </tr>
          </thead>
          <tbody>
            {riesgos.map((r, idx) => (
              <tr key={idx} className="border-t border-red-100 bg-white hover:bg-red-50/50">
                <td className="p-2 pl-4">
                  <span className="font-bold text-gray-800">{r.apellidos}</span>, {r.nombres}
                  <div className="text-xs text-gray-400 font-mono">{r.alumno_dni}</div>
                </td>
                <td className="p-2 text-gray-600">{r.grado_nombre}</td>
                <td className="p-2 text-center font-bold">{r.inasistencias_mes}</td>
                <td className="p-2 text-center font-bold text-red-600">
                  {r.inasistencias_consecutivas > 0 ? r.inasistencias_consecutivas : '-'}
                </td>
                <td className="p-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    r.nivel_riesgo === 'Alto' ? 'bg-red-600 text-white' : 'bg-orange-100 text-orange-800'
                  }`}>
                    {r.nivel_riesgo.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RiesgoDesercionWidget;
