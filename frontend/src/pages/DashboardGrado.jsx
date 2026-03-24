import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDashboard } from '../hooks/useDashboard';
import { useAlumnos } from '../hooks/useAlumnos';
import RiesgoDesercionWidget from '../components/RiesgoDesercionWidget';
import ModalAlumno from '../components/ModalAlumno';
import ModalJustificacion from '../components/ModalJustificacion';
import ModalJustificacionesLista from '../components/ModalJustificacionesLista';
import ModalAsistencia from '../components/ModalAsistencia';
import { DashboardKpiSkeleton, DashboardChartSkeleton } from '../components/Skeletons';
import { FileDown, FileText, UserPlus, Edit, Trash2, Edit3, BarChart3, LineChart, PieChart, Plus, QrCode, Download } from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import apiClient from '../api/client';
import Swal from 'sweetalert2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const DashboardGrado = () => {
    const { gradoId } = useParams();
    const { loading: dashLoading, data: dashData, error, fetchDashboardGrado } = useDashboard();
    const { loading: rosterLoading, alumnos, asistenciasHoy, loadRosterInfo, updateAsistenciaLocal } = useAlumnos();

    // Settings state
    const [chartType, setChartType] = useState('line');
    const [periodo, setPeriodo] = useState('hoy');

    // Modals state
    const [modalAlumnoOpen, setModalAlumnoOpen] = useState(false);
    const [alumnoToEdit, setAlumnoToEdit] = useState(null);

    const [modalJustificacionOpen, setModalJustificacionOpen] = useState(false);
    const [justificacionToEdit, setJustificacionToEdit] = useState(null);
    const [modalJustificacionesListaOpen, setModalJustificacionesListaOpen] = useState(false);

    const handleEditJustificacion = (justificacion) => {
        setJustificacionToEdit(justificacion);
        setModalJustificacionesListaOpen(false);
        setModalJustificacionOpen(true);
    };

    const openNewJustificationModal = () => {
        setJustificacionToEdit(null);
        setModalJustificacionOpen(true);
    };

    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [qrAlumno, setQrAlumno] = useState(null);

    const refreshData = () => {
        fetchDashboardGrado(gradoId, periodo);
        loadRosterInfo(gradoId);
    };

    // Phase 9: Excel Import & PDF Credentials
    const [isImporting, setIsImporting] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const handleDownloadTemplate = () => {
        window.open(`${apiClient.defaults.baseURL}/alumnos/modelo-excel`, '_blank');
    };

    const handleImportExcel = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            setIsImporting(true);
            const response = await apiClient.post(`/alumnos/importar/${gradoId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            Swal.fire('¡Éxito!', response.data.message, 'success');
            refreshData();
        } catch (error) {
            const msg = error.response?.data?.detail || 'Error al importar el archivo Excel';
            Swal.fire('Error', msg, 'error');
        } finally {
            setIsImporting(false);
            e.target.value = '';
        }
    };

    const getBase64QrFromApi = async (dni) => {
        try {
            const response = await apiClient.get(`/alumnos/${dni}/qr`, { responseType: 'blob' });
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(response.data);
            });
        } catch (err) {
            return null;
        }
    };

    const handleGenerateCredenciales = async () => {
        if (!alumnos || alumnos.length === 0) {
            Swal.fire('Vacío', 'No hay alumnos para generar credenciales', 'info');
            return;
        }

        try {
            setIsGeneratingPdf(true);
            const { jsPDF } = await import('jspdf');

            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            let x = 10;
            let y = 10;
            const cardWidth = 90;
            const cardHeight = 55;
            const spacing = 8;
            const schoolName = "I.E. N° 22760";
            const currentYear = new Date().getFullYear();

            for (let i = 0; i < alumnos.length; i++) {
                const alumno = alumnos[i];

                // 1. Draw Card Background & Border
                doc.setDrawColor(226, 232, 240); // Subtle slate-200 border
                doc.setLineWidth(0.3);
                doc.setFillColor(255, 255, 255);
                doc.roundedRect(x, y, cardWidth, cardHeight, 4, 4, 'FD');

                // 2. Premium Header Bar
                doc.setFillColor(31, 78, 121); // Primary blue
                doc.roundedRect(x, y, cardWidth, 14, 4, 4, 'F');
                doc.rect(x, y + 10, cardWidth, 4, 'F'); // Square edges for the bottom of header

                // 3. Header Text
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(10);
                doc.setFont("helvetica", "bold");
                doc.text(schoolName, x + cardWidth / 2, y + 9, { align: "center" });

                // 4. Student Name (Multi-line support)
                doc.setTextColor(31, 78, 121); // Primary blue for name
                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                
                const fullName = `${alumno.apellidos.toUpperCase()}, ${alumno.nombres}`;
                const lines = doc.splitTextToSize(fullName, 55); // Width allowed for text
                doc.text(lines, x + 6, y + 23);

                // 5. Student Details
                const nameHeight = lines.length * 5; // Estimate height based on lines
                const detailsY = Math.max(y + 23 + nameHeight + 2, y + 35);

                doc.setTextColor(71, 85, 105); // Slate-600
                doc.setFontSize(9);
                doc.setFont("helvetica", "bold");
                doc.text("DNI:", x + 6, detailsY);
                doc.setFont("helvetica", "normal");
                doc.text(String(alumno.dni), x + 15, detailsY);

                doc.setFont("helvetica", "bold");
                doc.text("Grado:", x + 6, detailsY + 5);
                doc.setFont("helvetica", "normal");
                doc.text(dashData?.grado_nombre || '-', x + 18, detailsY + 5);

                doc.setFont("helvetica", "bold");
                doc.text("Vigencia:", x + 6, detailsY + 10);
                doc.setFont("helvetica", "normal");
                doc.text(String(currentYear), x + 22, detailsY + 10);

                // 6. Accent Bottom Line
                doc.setDrawColor(31, 78, 121);
                doc.setLineWidth(1.5);
                doc.line(x + 6, y + cardHeight - 6, x + 25, y + cardHeight - 6);

                // 7. QR Code Implementation
                const base64Qr = await getBase64QrFromApi(alumno.dni);
                if (base64Qr) {
                    // White container for QR for better scanning
                    doc.setDrawColor(241, 245, 249);
                    doc.setLineWidth(0.2);
                    doc.setFillColor(255, 255, 255);
                    doc.roundedRect(x + cardWidth - 32, y + 18, 28, 28, 2, 2, 'FD');
                    
                    doc.addImage(base64Qr, 'PNG', x + cardWidth - 30.5, y + 19.5, 25, 25);
                }

                // 8. Layout Logic for Printing Page
                x += cardWidth + spacing;
                if (x + cardWidth > 210) { // Page width limit (A4 ~210mm)
                    x = 10;
                    y += cardHeight + spacing;
                }

                if (y + cardHeight > 297 - spacing && i < alumnos.length - 1) { // Page height limit (A4 ~297mm)
                    doc.addPage();
                    x = 10;
                    y = 10;
                }
            }

            doc.save(`Carnets_${dashData?.grado_nombre || 'IE22760'}.pdf`);
            Swal.fire('¡Éxito!', 'Los carnets han sido generados con el nuevo diseño.', 'success');
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'Hubo un error al generar el PDF.', 'error');
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    useEffect(() => {
        if (gradoId) {
            refreshData();
        }
    }, [gradoId]);

    if (dashLoading && !dashData) return (
        <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-primary">Cargando Grado...</h1>
                    <p className="text-muted mt-1">Obteniendo parámetros del sistema</p>
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
        labels: dashData?.chart_data?.labels || [],
        datasets: [
            {
                label: 'Asistencias',
                data: dashData?.chart_data?.asistencias || [],
                borderColor: '#27AE60',
                backgroundColor: chartType === 'line' ? 'rgba(39, 174, 96, 0.1)' : '#27AE60',
                fill: true,
                pointRadius: 4, pointHoverRadius: 6, borderWidth: 2
            },
            {
                label: 'Tardanzas',
                data: dashData?.chart_data?.tardanzas || [],
                borderColor: '#F39C12',
                backgroundColor: chartType === 'line' ? 'transparent' : '#F39C12',
                pointRadius: 4, pointHoverRadius: 6, borderWidth: 2
            },
            {
                label: 'Faltas',
                data: dashData?.chart_data?.inasistencias || [],
                borderColor: '#E74C3C',
                backgroundColor: chartType === 'line' ? 'transparent' : '#E74C3C',
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
        labels: ['Asistencias', 'Tardanzas', 'Faltas'],
        datasets: [
            {
                data: [
                    dashData?.kpis?.asistencias || 0,
                    dashData?.kpis?.tardanzas || 0,
                    dashData?.kpis?.inasistencias || 0
                ],
                backgroundColor: ['#27AE60', '#F39C12', '#E74C3C'],
                borderWidth: 1,
            },
        ],
    };

    const getRecordValue = (dni) => {
        const record = (asistenciasHoy || []).find(a => String(a.alumno_dni) === String(dni));
        return record ? record.estado : 'sin_marcar';
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'asistencia': return { bg: 'var(--status-present-bg)', text: 'var(--status-present)' };
            case 'tardanza': return { bg: 'var(--status-late-bg)', text: 'var(--status-late)' };
            case 'inasistencia': return { bg: 'var(--status-absent-bg)', text: 'var(--status-absent)' };
            case 'justificacion': return { bg: 'var(--status-justified-bg)', text: 'var(--status-justified)' };
            default: return { bg: '#F8FAFC', text: 'var(--text-muted)' };
        }
    };

    const handleInlineStatusChange = async (dni, nuevoEstado) => {
        const estadoAnterior = getRecordValue(dni);
        updateAsistenciaLocal(dni, nuevoEstado);

        try {
            await apiClient.post(`/asistencia/override`, {
                alumno_dni: dni,
                estado: nuevoEstado
            });
            // Background refresh dashboard (don't show local spinner)
            fetchDashboardGrado(gradoId, periodo);
        } catch (error) {
            updateAsistenciaLocal(dni, estadoAnterior);
            const msg = error.response?.data?.detail || 'Error modificando asistencia';
            Swal.fire({ title: 'Error', text: msg, icon: 'error', confirmButtonColor: '#1F4E79' });
        }
    };

    const handleDeleteAlumno = async (dni, nombre) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: `Se eliminará al alumno ${nombre} (DNI: ${dni}) y su código QR.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#E74C3C',
            cancelButtonColor: '#1F4E79',
            confirmButtonText: 'Sí, eliminar'
        });

        if (result.isConfirmed) {
            try {
                await apiClient.delete(`/alumnos/${dni}`);
                Swal.fire('Eliminado', 'El alumno ha sido eliminado.', 'success');
                // Refresh both roster and dashboard KPIs/Charts
                loadRosterInfo(gradoId);
                fetchDashboardGrado(gradoId, periodo);
            } catch (err) {
                Swal.fire('Error', 'No se pudo eliminar al alumno.', 'error');
            }
        }
    };



    return (
        <>
            <div className="animate-fade-in">
                <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-heading text-primary">
                            Grado: {dashData?.grado_nombre || 'Cargando...'}
                        </h1>
                        <p className="text-muted text-sm">Resumen de asistencia del aula</p>
                    </div>

                    <div className="flex flex-row gap-2 items-center w-full md:w-auto mt-4 md:mt-0 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                        <select
                            className="form-select font-sans text-xs sm:text-sm h-full shrink-0"
                            style={{ width: '130px', padding: '0.5rem 1.5rem 0.5rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}
                            value={periodo}
                            onChange={(e) => {
                                setPeriodo(e.target.value);
                                fetchDashboardGrado(gradoId, e.target.value);
                            }}
                        >
                            <option value="hoy">Hoy</option>
                            <option value="semana">Esta Semana</option>
                            <option value="mes">Este Mes</option>
                            <option value="año">Este Año</option>
                        </select>
                        <div className="flex flex-row gap-2 shrink-0">
                            <button className="btn btn-secondary flex justify-center items-center gap-1 bg-gray-200 border-gray-300 text-gray-800 text-xs sm:text-sm shrink-0" onClick={() => setModalJustificacionesListaOpen(true)} style={{ height: '36px', padding: '0 0.75rem' }}>
                                <FileText size={14} /> Ver Justific.
                            </button>
                            <button className="btn btn-secondary flex justify-center items-center gap-1 bg-gray-200 border-gray-300 text-gray-800 text-xs sm:text-sm shrink-0" onClick={() => openNewJustificationModal()} style={{ height: '36px', padding: '0 0.75rem' }}>
                                <Plus size={14} /> Nueva Justific.
                            </button>
                        </div>
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid gap-4 mb-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                    <div className="card pl-4">
                        <h3 className="text-muted text-sm uppercase">Total Alumnos</h3>
                        <p className="text-2xl font-bold mt-1">{dashData?.kpis?.total_alumnos || 0}</p>
                    </div>
                    <div className="card border-l-4" style={{ borderLeft: '4px solid var(--status-present)' }}>
                        <h3 className="text-muted text-sm uppercase">Presentes</h3>
                        <p className="text-2xl font-bold mt-1 text-status-present">{dashData?.kpis?.asistencias || 0}</p>
                    </div>
                    <div className="card border-l-4" style={{ borderLeft: '4px solid var(--status-late)' }}>
                        <h3 className="text-muted text-sm uppercase">Tardanzas</h3>
                        <p className="text-2xl font-bold mt-1 text-status-late">{dashData?.kpis?.tardanzas || 0}</p>
                    </div>
                    <div className="card border-l-4" style={{ borderLeft: '4px solid var(--status-absent)' }}>
                        <h3 className="text-muted text-sm uppercase">Faltas</h3>
                        <p className="text-2xl font-bold mt-1 text-status-absent">{dashData?.kpis?.inasistencias || 0}</p>
                    </div>
                </div>

                <div className="mb-6">
                    <RiesgoDesercionWidget gradoId={parseInt(gradoId)} />
                </div>

                <div className="dashboard-grid">

                    {/* Registro del Día Table */}
                    <div className="card" style={{ height: '470px', display: 'flex', flexDirection: 'column', padding: 0 }}>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4" style={{ padding: '1.5rem' }}>
                            <h3 className="font-heading text-primary m-0">Registro de Alumnos</h3>

                            <div className="flex flex-row gap-2 items-center w-full md:w-auto mt-4 md:mt-0 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                                <input
                                    type="file"
                                    id="excel-upload"
                                    accept=".xlsx"
                                    style={{ display: 'none' }}
                                    onChange={handleImportExcel}
                                />
                                <button
                                    className="btn btn-secondary flex justify-center items-center gap-1 opacity-90 hover:opacity-100 text-xs shrink-0"
                                    style={{ padding: '0 0.5rem', backgroundColor: '#f3f4f6', color: '#4b5563', borderColor: '#d1d5db', height: '36px' }}
                                    onClick={handleDownloadTemplate}
                                    title="Descargar Planilla Modelo"
                                >
                                    <Download size={14} /> Plantilla
                                </button>

                                <button
                                    className="btn btn-secondary flex justify-center items-center gap-1 opacity-90 hover:opacity-100 text-xs shrink-0"
                                    style={{ padding: '0 0.5rem', backgroundColor: '#e8f5e9', color: '#2e7d32', borderColor: '#c8e6c9', height: '36px' }}
                                    onClick={() => document.getElementById('excel-upload').click()}
                                    disabled={isImporting}
                                >
                                    <FileDown size={14} /> {isImporting ? 'Cargando...' : 'Importar'}
                                </button>

                                <button
                                    className="btn btn-secondary flex justify-center items-center gap-1 opacity-90 hover:opacity-100 text-xs shrink-0"
                                    style={{ padding: '0 0.5rem', backgroundColor: '#e3f2fd', color: '#1565c0', borderColor: '#bbdefb', height: '36px' }}
                                    onClick={handleGenerateCredenciales}
                                    disabled={isGeneratingPdf}
                                >
                                    <QrCode size={14} /> {isGeneratingPdf ? 'Generando...' : 'Carnets'}
                                </button>

                                <button
                                    className="btn btn-secondary flex justify-center items-center gap-1 text-xs shrink-0"
                                    style={{ padding: '0 0.5rem', height: '36px' }}
                                    onClick={() => { setAlumnoToEdit(null); setModalAlumnoOpen(true); }}
                                >
                                    <UserPlus size={14} /> Alumno
                                </button>
                            </div>
                        </div>

                        <div className="table-container" style={{ flex: 1, overflowY: 'auto', border: 'none', borderTop: '1px solid var(--border-color)', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }}>
                            <table className="table" style={{ margin: 0 }}>
                                <thead style={{ position: 'sticky', top: 0, zIndex: 1, boxShadow: '0 1px 0 var(--border-color)' }}>
                                    <tr>
                                        <th>DNI</th>
                                        <th>Alumno</th>
                                        <th>Estado Hoy</th>
                                        <th style={{ textAlign: 'right' }}>Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rosterLoading ? (
                                        <tr>
                                            <td colSpan="4" className="text-center text-muted" style={{ padding: '2rem' }}>
                                                Cargando listado de alumnos...
                                            </td>
                                        </tr>
                                    ) : alumnos && alumnos.length > 0 ? (
                                        alumnos.map(alumno => (
                                            <tr key={alumno.dni}>
                                                <td
                                                    className="font-bold text-sm text-primary cursor-pointer hover:underline"
                                                    onClick={() => { setQrAlumno(alumno); setQrModalOpen(true); }}
                                                    title="Ver Código QR"
                                                >
                                                    {alumno.dni}
                                                </td>
                                                <td className="font-medium">{alumno.apellidos}, {alumno.nombres}</td>
                                                <td>
                                                    <select
                                                        className="status-select"
                                                        style={{
                                                            backgroundColor: getStatusColor(getRecordValue(alumno.dni)).bg,
                                                            color: getStatusColor(getRecordValue(alumno.dni)).text,
                                                            borderColor: getStatusColor(getRecordValue(alumno.dni)).text,
                                                            cursor: getRecordValue(alumno.dni) === 'justificacion' ? 'default' : 'pointer',
                                                            opacity: getRecordValue(alumno.dni) === 'justificacion' ? 0.85 : 1
                                                        }}
                                                        value={getRecordValue(alumno.dni)}
                                                        onChange={(e) => handleInlineStatusChange(alumno.dni, e.target.value)}
                                                        disabled={getRecordValue(alumno.dni) === 'justificacion'}
                                                        title={getRecordValue(alumno.dni) === 'justificacion' ? "Este registro está justificado formalmente e inalterable." : ""}
                                                    >
                                                        {getRecordValue(alumno.dni) === 'justificacion' ? (
                                                            <option value="justificacion">Justificado</option>
                                                        ) : (
                                                            <>
                                                                <option value="sin_marcar" disabled>Sin marcar</option>
                                                                <option value="asistencia">Presente</option>
                                                                <option value="tardanza">Tardanza</option>
                                                                <option value="inasistencia">Inasistencia</option>
                                                            </>
                                                        )}
                                                    </select>
                                                </td>
                                                <td>
                                                    <div className="flex justify-end gap-1">
                                                        <button
                                                            title="Editar Alumno"
                                                            onClick={() => { setAlumnoToEdit(alumno); setModalAlumnoOpen(true); }}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--secondary)', padding: '0.25rem', borderRadius: '4px' }}
                                                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(52, 152, 219, 0.1)'}
                                                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            title="Eliminar Alumno"
                                                            onClick={() => handleDeleteAlumno(alumno.dni, alumno.nombres)}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--status-absent)', padding: '0.25rem', borderRadius: '4px' }}
                                                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(231, 76, 60, 0.1)'}
                                                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="text-center text-muted" style={{ padding: '2rem' }}>
                                                No hay alumnos registrados en este grado.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Chart View */}
                    <div className="card" style={{ height: '470px', padding: '1.5rem 1.5rem 2rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-heading text-primary m-0">Evolución de Asistencia</h3>

                            {/* Chart Type Toggle */}
                            <div className="flex bg-gray-100 rounded-md p-1" style={{ backgroundColor: '#EDF2F7' }}>
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
                            {dashData?.chart_data?.labels?.length > 0 ? (
                                chartType === 'line' ? <Line options={chartOptions} data={chartData} /> :
                                    chartType === 'bar' ? <Bar options={chartOptions} data={chartData} /> :
                                        <Pie options={pieOptions} data={pieData} />
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted">No hay datos para mostrar en este rango</div>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* Render Modals */}
            <ModalAlumno
                isOpen={modalAlumnoOpen}
                onClose={() => setModalAlumnoOpen(false)}
                gradoId={gradoId}
                alumnoEdit={alumnoToEdit}
                onRefresh={refreshData}
            />
            <ModalJustificacion
                isOpen={modalJustificacionOpen}
                onClose={() => { setModalJustificacionOpen(false); setJustificacionToEdit(null); }}
                alumnos={alumnos}
                justificacionEdit={justificacionToEdit}
                onRefresh={refreshData}
            />
            <ModalJustificacionesLista
                isOpen={modalJustificacionesListaOpen}
                onClose={() => setModalJustificacionesListaOpen(false)}
                gradoId={gradoId}
                onEdit={handleEditJustificacion}
            />
            {/* QR Render Modal */}
            {qrModalOpen && qrAlumno && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div
                        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(18, 49, 79, 0.5)', backdropFilter: 'blur(4px)' }}
                        onClick={() => setQrModalOpen(false)}
                    />
                    <div className="card animate-fade-in" style={{ position: 'relative', width: '100%', maxWidth: '380px', padding: '2rem', textAlign: 'center' }}>
                        <h2 className="font-heading text-lg mb-4 text-primary">Identificador Digital</h2>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${qrAlumno.codigo_qr}`}
                                alt="QR Code Alumno"
                                style={{ margin: '0 auto', display: 'block', borderRadius: '8px', border: '5px solid white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                            />
                        </div>

                        <div style={{ padding: '1rem', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Estudiante
                            </p>
                            <p style={{ margin: '0.25rem 0', fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
                                {qrAlumno.nombres} <br /> {qrAlumno.apellidos}
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>DNI:</span>
                                <span style={{ fontSize: '0.875rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)', backgroundColor: 'white', padding: '0.125rem 0.5rem', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                                    {qrAlumno.dni}
                                </span>
                            </div>
                        </div>

                        <button className="btn btn-secondary mt-6 w-full" onClick={() => setQrModalOpen(false)}>Cerrar</button>
                    </div>
                </div>
            )}

        </>
    );
};

export default DashboardGrado;
