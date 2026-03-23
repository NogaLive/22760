import { useState, useCallback } from 'react';
import apiClient from '../api/client';
import Swal from 'sweetalert2';

export const useDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchDashboardGeneral = useCallback(async (filtro = 'hoy') => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/dashboard/general?filtro=${filtro}`);
      setData(response.data);
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al obtener datos del dashboard';
      setError(msg);
      Swal.fire({ title: 'Error', text: msg, icon: 'error', confirmButtonColor: '#1F4E79' });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDashboardGrado = useCallback(async (gradoId, filtro = 'hoy') => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/dashboard/grado/${gradoId}?filtro=${filtro}`);
      setData(response.data);
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al obtener datos del grado';
      setError(msg);
      Swal.fire({ title: 'Error', text: msg, icon: 'error', confirmButtonColor: '#1F4E79' });
    } finally {
      setLoading(false);
    }
  }, []);

  const forceRefresh = useCallback(async () => {
    try {
      await apiClient.post('/dashboard/actualizar');
      return true;
    } catch (err) {
      console.error('Error forzando actualización:', err);
      return false;
    }
  }, []);

  return { loading, data, error, fetchDashboardGeneral, fetchDashboardGrado, forceRefresh };
};
