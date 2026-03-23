import { useEffect, useState } from 'react';
import { useDashboard } from '../hooks/useDashboard';
import { useAuth } from '../hooks/useAuth';
import RiesgoDesercionWidget from '../components/RiesgoDesercionWidget';
import { BarChart3, LineChart, PieChart, FileDown } from 'lucide-react';
import { DashboardKpiSkeleton, DashboardChartSkeleton } from '../components/Skeletons';
import apiClient from '../api/client';
import Swal from 'sweetalert2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const { user } = useAuth();
  const { loading, data, error, fetchDashboardGeneral } = useDashboard();
  const [chartType, setChartType] = useState('bar');
  const [periodo, setPeriodo] = useState('hoy');

  useEffect(() => {
    fetchDashboardGeneral(periodo);
  }, [fetchDashboardGeneral, periodo]);

  const handleExportGeneral = async () => {
    try {
      const response = await apiClient.get(`/exportar/general?periodo=${periodo}`, {
        responseType: 'blob' 
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `asistencia_general_${periodo}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      Swal.fire('Error', 'No se pudo descargar el archivo Excel general', 'error');
    }
  };

  if (loading && !data) return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-primary">Panel General</h1>
          <p className="text-muted mt-1">Visión global de la institución</p>
        </div>
      </div>
      <DashboardKpiSkeleton />
      <DashboardChartSkeleton />
    </div>
  );
  if (error) return <div className="p-4 text-primary bg-status-absent-bg">{error}</div>;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: false }
    },
    scales: {
      y: { beginAtZero: true },
      x: {} 
    },
    tension: 0.3
  };

  const chartData = {
    labels: data?.chart_data?.labels || [],
    datasets: [
      {
        label: 'Asistencias',
        data: data?.chart_data?.asistencias || [],
        backgroundColor: chartType === 'line' ? 'rgba(39, 174, 96, 0.1)' : '#27AE60',
        borderColor: '#27AE60',
        fill: chartType === 'line',
        pointRadius: 4, pointHoverRadius: 6, borderWidth: 2
      },
      {
        label: 'Tardanzas',
        data: data?.chart_data?.tardanzas || [],
        backgroundColor: chartType === 'line' ? 'transparent' : '#F39C12',
        borderColor: '#F39C12',
        pointRadius: 4, pointHoverRadius: 6, borderWidth: 2
      },
      {
        label: 'Faltas',
        data: data?.chart_data?.inasistencias || [],
        backgroundColor: chartType === 'line' ? 'transparent' : '#E74C3C',
        borderColor: '#E74C3C',
        pointRadius: 4, pointHoverRadius: 6, borderWidth: 2
      },
      {
        label: 'Justificadas',
        data: data?.chart_data?.justificaciones || [],
        backgroundColor: chartType === 'line' ? 'transparent' : '#3498DB',
        borderColor: '#3498DB',
        pointRadius: 4, pointHoverRadius: 6, borderWidth: 2
      }
    ],
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' }
    }
  };

  const pieData = {
    labels: ['Asistencias', 'Tardanzas', 'Faltas', 'Justificadas'],
    datasets: [
      {
        data: [
          data?.kpis?.asistencias || 0,
          data?.kpis?.tardanzas || 0,
          data?.kpis?.inasistencias || 0,
          (data?.kpis?.justificaciones_tardanza || 0) + (data?.kpis?.justificaciones_inasistencia || 0)
        ],
        backgroundColor: ['#27AE60', '#F39C12', '#E74C3C', '#3498DB'],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-heading text-primary">Panel General Institucional</h1>
          <p className="text-muted text-sm">Resumen de asistencia de todos los grados</p>
        </div>
        
        {/* Filtros */}
        <div className="flex gap-4 items-center">
          <select 
            className="form-select font-sans text-sm h-full" 
            style={{ width: '150px', padding: '0.625rem 2rem 0.625rem 1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}
            onChange={(e) => setPeriodo(e.target.value)}
            value={periodo}
          >
            <option value="hoy">Hoy</option>
            <option value="semana">Esta Semana</option>
            <option value="mes">Este Mes</option>
            <option value="año">Este Año</option>
          </select>

          <button className="btn btn-primary flex items-center gap-2" onClick={handleExportGeneral} style={{ height: '100%', padding: '0.625rem 1rem' }}>
            <FileDown size={16} /> Exportar Excel
          </button>
        </div>
      </div>
      
      {/* KPIs */}
      <div className="grid gap-4 mb-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="card text-center" style={{ borderTop: '4px solid var(--primary)' }}>
          <h3 className="text-muted text-sm uppercase">Total Alumnos</h3>
          <p className="text-2xl font-bold mt-2">{data?.kpis?.total_alumnos || 0}</p>
        </div>
        <div className="card text-center" style={{ borderTop: '4px solid var(--status-present)' }}>
          <h3 className="text-muted text-sm uppercase">Asistencias</h3>
          <p className="text-2xl font-bold mt-2" style={{ color: 'var(--status-present)' }}>{data?.kpis?.asistencias || 0}</p>
          <p className="text-sm text-muted">{data?.kpis?.porcentaje_asistencia || 0}%</p>
        </div>
        <div className="card text-center" style={{ borderTop: '4px solid var(--status-late)' }}>
          <h3 className="text-muted text-sm uppercase">Tardanzas</h3>
          <p className="text-2xl font-bold mt-2" style={{ color: 'var(--status-late)' }}>{data?.kpis?.tardanzas || 0}</p>
          <p className="text-sm text-muted">{data?.kpis?.porcentaje_tardanza || 0}%</p>
        </div>
        <div className="card text-center" style={{ borderTop: '4px solid var(--status-absent)' }}>
          <h3 className="text-muted text-sm uppercase">Faltas</h3>
          <p className="text-2xl font-bold mt-2" style={{ color: 'var(--status-absent)' }}>{data?.kpis?.inasistencias || 0}</p>
          <p className="text-sm text-muted">{data?.kpis?.porcentaje_inasistencia || 0}%</p>
        </div>
        <div className="card text-center" style={{ borderTop: '4px solid var(--status-justified)' }}>
          <h3 className="text-muted text-sm uppercase">Justificadas</h3>
          <p className="text-2xl font-bold mt-2" style={{ color: 'var(--status-justified)' }}>
            {(data?.kpis?.justificaciones_tardanza || 0) + (data?.kpis?.justificaciones_inasistencia || 0)}
          </p>
          <p className="text-sm text-muted">{data?.kpis?.porcentaje_justificacion || 0}%</p>
        </div>
      </div>

      <div className="mb-6">
        <RiesgoDesercionWidget />
      </div>

      <div className="card" style={{ height: '450px', padding: '1.5rem 1.5rem 2rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-heading text-primary m-0">Comparativa por Grados</h3>
          
          <div className="flex bg-gray-100 rounded-md p-1" style={{ backgroundColor: '#EDF2F7' }}>
            <button 
              onClick={() => setChartType('bar')}
              style={{ 
                background: chartType === 'bar' ? 'white' : 'transparent',
                color: chartType === 'bar' ? 'var(--primary)' : 'var(--text-muted)',
                border: 'none', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', cursor: 'pointer',
                boxShadow: chartType === 'bar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'flex', alignItems: 'center', transition: 'all 0.2s'
              }}
            >
              <BarChart3 size={16} />
            </button>
            <button 
              onClick={() => setChartType('line')}
              style={{ 
                background: chartType === 'line' ? 'white' : 'transparent',
                color: chartType === 'line' ? 'var(--primary)' : 'var(--text-muted)',
                border: 'none', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', cursor: 'pointer',
                boxShadow: chartType === 'line' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'flex', alignItems: 'center', transition: 'all 0.2s'
              }}
            >
              <LineChart size={16} />
            </button>
            <button 
              onClick={() => setChartType('pie')}
              style={{ 
                background: chartType === 'pie' ? 'white' : 'transparent',
                color: chartType === 'pie' ? 'var(--primary)' : 'var(--text-muted)',
                border: 'none', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', cursor: 'pointer',
                boxShadow: chartType === 'pie' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'flex', alignItems: 'center', transition: 'all 0.2s'
              }}
            >
              <PieChart size={16} />
            </button>
          </div>
        </div>

        <div style={{ position: 'relative', flex: 1, width: '100%' }}>
          {data?.chart_data?.labels?.length > 0 ? (
            chartType === 'line' ? <Line options={chartOptions} data={chartData} /> : 
            chartType === 'bar' ? <Bar options={chartOptions} data={chartData} /> :
            <Pie options={pieOptions} data={pieData} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted">No hay datos para mostrar en este rango</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
