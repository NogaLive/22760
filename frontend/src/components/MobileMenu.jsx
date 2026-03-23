import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { X, LayoutDashboard, QrCode, LogOut, Users, UserSquare2, Calendar } from 'lucide-react';

const MobileMenu = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const grados = user?.grados || [];

  if (!isOpen) return null;

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 50,
          backdropFilter: 'blur(4px)'
        }}
      />
      
      {/* Drawer */}
      <div 
        className="animate-slide-in"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '280px',
          backgroundColor: 'var(--primary-dark)',
          color: 'white',
          zIndex: 60,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '4px 0 25px rgba(0,0,0,0.3)',
          overflowY: 'auto'
        }}
      >
        <div className="flex justify-between items-center" style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div>
            <h2 className="text-xl font-heading mb-0" style={{ color: 'white' }}>I.E N°22760</h2>
            <p className="text-sm m-0" style={{ color: 'rgba(255,255,255,0.6)' }}>Control de Asistencia</p>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '0.25rem' }}
          >
            <X size={24} />
          </button>
        </div>

        <nav style={{ padding: '1.5rem 0', flex: 1 }}>
          <ul style={{ listStyle: 'none' }}>
            <li style={{ marginBottom: '0.5rem' }}>
              <NavLink 
                to="/dashboard"
                end
                onClick={onClose}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.875rem 1.5rem',
                  color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                  backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                  borderLeft: isActive ? '4px solid var(--secondary)' : '4px solid transparent',
                  textDecoration: 'none',
                  fontWeight: isActive ? 600 : 400
                })}
              >
                <LayoutDashboard size={20} />
                <span>General</span>
              </NavLink>
            </li>

            <li style={{ marginBottom: '0.5rem' }}>
              <NavLink 
                to="/escaner-qr"
                onClick={onClose}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.875rem 1.5rem',
                  color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                  backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                  borderLeft: isActive ? '4px solid var(--secondary)' : '4px solid transparent',
                  textDecoration: 'none',
                  fontWeight: isActive ? 600 : 400
                })}
              >
                <div style={{ backgroundColor: 'var(--secondary)', color: 'white', padding: '0.25rem', borderRadius: '4px', display: 'flex' }}>
                  <QrCode size={16} />
                </div>
                <span>Escáner QR</span>
              </NavLink>
            </li>

            <div style={{ padding: '1.25rem 1.5rem 0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
              Grados a Cargo
            </div>

            {grados.map((grado) => (
              <li key={grado.id} style={{ marginBottom: '0.25rem' }}>
                <NavLink 
                  to={`/dashboard/grado/${grado.id}`}
                  onClick={onClose}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.75rem 1.5rem',
                    color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                    backgroundColor: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                    borderLeft: isActive ? '2px solid var(--secondary)' : '2px solid transparent',
                    textDecoration: 'none'
                  })}
                >
                  {grado.nivel === 'inicial' ? <UserSquare2 size={16} /> : <Users size={16} />}
                  <span style={{ fontSize: '0.9rem' }}>{grado.nombre}</span>
                </NavLink>
              </li>
            ))}

            {/* Administracion - Feriados (Solo Director) */}
            {user?.rol === 'director' && (
              <>
                <div style={{ padding: '1.25rem 1.5rem 0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                  Administración
                </div>
                <li style={{ marginBottom: '0.25rem' }}>
                  <NavLink 
                    to="/feriados"
                    onClick={onClose}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '0.75rem 1.5rem',
                      color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                      backgroundColor: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                      borderLeft: isActive ? '2px solid var(--secondary)' : '2px solid transparent',
                      textDecoration: 'none'
                    })}
                  >
                    <Calendar size={16} />
                    <span style={{ fontSize: '0.9rem' }}>Feriados / Calendario</span>
                  </NavLink>
                </li>
              </>
            )}
          </ul>
        </nav>

        <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button 
            onClick={handleLogout}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              width: '100%', 
              padding: '0.75rem', 
              background: 'rgba(231, 76, 60, 0.1)', 
              color: '#FF6B6B', 
              border: '1px solid rgba(231, 76, 60, 0.2)', 
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default MobileMenu;
