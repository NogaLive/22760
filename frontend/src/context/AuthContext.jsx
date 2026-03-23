import { createContext, useState, useEffect } from 'react';
import apiClient from '../api/client';
import Swal from 'sweetalert2';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for existing session
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (err) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    
    setLoading(false);
  }, []);

  const login = async (dni, password) => {
    try {
      const response = await apiClient.post('/auth/login', {
        dni: parseInt(dni, 10),
        password: password
      });
      
      const { access_token, docente } = response.data;
      
      // Save session
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(docente));
      
      setUser(docente);
      setIsAuthenticated(true);
      
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Error al conectar con el servidor';
      
      Swal.fire({
        title: 'Error de acceso',
        text: errorMsg,
        icon: 'error',
        confirmButtonColor: '#1F4E79'
      });
      
      return { success: false, error: errorMsg };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      loading,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};
