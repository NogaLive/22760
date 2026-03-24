import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import apiClient from '../api/client';
import Swal from 'sweetalert2';

const EscanerQR = () => {
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const scannerRef = useRef(null);
  const processingRef = useRef(false);

  const handleScanSuccess = useCallback(async (decodedText) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);

    try {
      const response = await apiClient.post('/asistencia/registrar', {
        codigo_qr: decodedText
      });

      await Swal.fire({
        title: 'Asistencia Registrada',
        html: `<strong>${response.data.alumno_nombre}</strong><br/>Estado: ${response.data.estado.toUpperCase()}`,
        icon: 'success',
        timer: 2500,
        showConfirmButton: false
      });
    } catch (error) {
      const status = error.response?.status;
      const msg = error.response?.data?.detail || 'Código no válido o ya registrado';
      
      if (status === 409 || msg.toLowerCase().includes('ya tiene registro')) {
        await Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'info',
          title: 'Asistencia ya registrada',
          text: msg,
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true
        });
      } else {
        const isSchedule = status === 400 && msg.includes("horario");
        await Swal.fire({
          title: isSchedule ? '⏰ Fuera de Horario' : 'Atención',
          text: msg,
          icon: isSchedule ? 'warning' : 'error',
          confirmButtonColor: '#1F4E79'
        });
      }
    } finally {
      setTimeout(() => {
        processingRef.current = false;
        setProcessing(false);
      }, 1500); // reduced cooldown so they can scan next student faster
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let qr = null;

    const initScanner = async () => {
      // Small timeout to allow React strict mode to clear DOM if it unmounted
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!isMounted) return;

      const element = document.getElementById("qr-reader");
      if (!element) return;
      
      // Ensure element is empty before starting
      element.innerHTML = "";
      
      qr = new Html5Qrcode("qr-reader");
      scannerRef.current = qr;

      try {
        await qr.start(
          { facingMode: "environment" },
          {
            fps: 60,
            qrbox: { width: 250, height: 250 },
          },
          handleScanSuccess,
          () => {}
        );
      } catch (err) {
        if (isMounted) {
          console.error("Camera start error:", err);
          Swal.fire({
            title: 'Cámara No Disponible',
            text: 'No se pudo acceder a la cámara. Verifica los permisos del navegador.',
            icon: 'error',
            confirmButtonColor: '#1F4E79'
          });
        }
      }
    };

    initScanner();

    return () => {
      isMounted = false;
      if (qr && qr.isScanning) {
        qr.stop().then(() => {
          qr.clear();
          const element = document.getElementById("qr-reader");
          if (element) element.innerHTML = ""; // Force clean DOM
        }).catch(() => {});
      } else if (qr) {
        qr.clear();
      }
    };
  }, [handleScanSuccess]);

  const handleGoBack = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().catch(() => {});
    }
    navigate('/dashboard');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      backgroundColor: '#000', color: 'white',
      display: 'flex', flexDirection: 'column'
    }}>
      {/* Top bar overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 60,
        display: 'flex', alignItems: 'center',
        padding: '1rem', background: 'rgba(0,0,0,0.6)'
      }}>
        <button
          onClick={handleGoBack}
          style={{
            background: 'transparent', border: 'none', color: 'white',
            cursor: 'pointer', display: 'flex', alignItems: 'center'
          }}
        >
          <ArrowLeft size={24} />
        </button>
        <h2 style={{ margin: '0 0 0 1rem', fontSize: '1.2rem', fontWeight: 'bold' }}>
          Escáner de Asistencia
        </h2>
      </div>

      {/* Scanner Container */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', overflow: 'hidden' }}>
        <div id="qr-reader" style={{ width: '100%', maxWidth: '600px', border: 'none' }} />
      </div>

      {/* Processing overlay */}
      {processing && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 70,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            width: '60px', height: '60px', border: '4px solid rgba(255,255,255,0.2)',
            borderTopColor: '#3498DB', borderRadius: '50%',
            animation: 'qr-spin 1s linear infinite'
          }} />
          <p style={{ marginTop: '1.5rem', fontWeight: 'bold', fontSize: '1.1rem' }}>Procesando código...</p>
        </div>
      )}

      {/* Helper text if not processing */}
      {!processing && (
        <div style={{
          position: 'absolute', bottom: '2rem', left: 0, right: 0, zIndex: 60,
          display: 'flex', justifyContent: 'center', pointerEvents: 'none'
        }}>
          <p style={{
            margin: 0, backgroundColor: 'rgba(0,0,0,0.7)', padding: '0.75rem 1.5rem',
            borderRadius: '20px', fontSize: '0.9rem', textAlign: 'center', color: 'white'
          }}>
            Apunta la cámara al recuadro para escanear
          </p>
        </div>
      )}

      <style>{`
        @keyframes qr-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default EscanerQR;
