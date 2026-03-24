import { useState, useCallback } from 'react';
import apiClient from '../api/client';
import Swal from 'sweetalert2';

export const useAlumnos = () => {
  const [loading, setLoading] = useState(false);
  const [alumnos, setAlumnos] = useState([]);
  const [asistenciasHoy, setAsistenciasHoy] = useState([]);

  // Fetch only students
  const fetchAlumnosByGrado = useCallback(async (gradoId) => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/alumnos/grado/${gradoId}`);
      // Fix mapping: the API returns an AlumnoListResponse which is an object { alumnos: [], total: number }
      setAlumnos(response.data.alumnos || []);
      return response.data.alumnos;
    } catch (err) {
      console.error(err);
      Swal.fire({ title: 'Error', text: 'No se pudieron cargar los alumnos', icon: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch today's attendances to map status to the students
  const fetchAsistenciasHoy = useCallback(async (gradoId) => {
    try {
      const response = await apiClient.get(`/asistencia/grado/${gradoId}`);
      const arrayData = Array.isArray(response.data) ? response.data : (response.data?.asistencias || []);
      setAsistenciasHoy(arrayData);
      return arrayData;
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Load both and merge for the view
  const loadRosterInfo = useCallback(async (gradoId) => {
    setLoading(true);
    await Promise.all([
      fetchAlumnosByGrado(gradoId),
      fetchAsistenciasHoy(gradoId)
    ]);
    setLoading(false);
  }, [fetchAlumnosByGrado, fetchAsistenciasHoy]);

  // Optimistic update
  const updateAsistenciaLocal = useCallback((dni, nuevoEstado) => {
    setAsistenciasHoy(prev => {
      const exists = prev.find(a => String(a.alumno_dni) === String(dni));
      if (exists) {
        return prev.map(a => String(a.alumno_dni) === String(dni) ? { ...a, estado: nuevoEstado } : a);
      } else {
        return [...prev, { alumno_dni: dni, estado: nuevoEstado, fecha: new Date().toISOString().split('T')[0] }];
      }
    });
  }, []);

  return { loading, alumnos, asistenciasHoy, loadRosterInfo, updateAsistenciaLocal };
};

