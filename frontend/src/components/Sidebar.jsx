import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LayoutDashboard, Users, UserSquare2, Calendar } from 'lucide-react';

const Sidebar = () => {
  const { user } = useAuth();
  const grados = user?.grados || [];

  return (
    <aside style={{
      width: '260px',
      backgroundColor: 'var(--primary-dark)',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: 0,
      height: '100vh',
      overflowY: 'auto',
      borderRight: '1px solid rgba(255,255,255,0.1)'
    }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <h2 className="text-xl font-heading mb-1" style={{ color: 'white' }}>Panel de Control</h2>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Asistencia 22760</p>
      </div>

      <nav style={{ padding: '1rem 0', flex: 1 }}>
        <ul style={{ listStyle: 'none' }}>
          
          <li style={{ marginBottom: '0.25rem' }}>
            <NavLink 
              to="/dashboard" 
              end
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1.5rem',
                color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                borderLeft: isActive ? '4px solid var(--secondary)' : '4px solid transparent',
                fontWeight: isActive ? 600 : 400,
                transition: 'all 0.2s',
                textDecoration: 'none'
              })}
            >
              <LayoutDashboard size={20} />
              <span>General (Todos)</span>
            </NavLink>
          </li>

          <div style={{ padding: '1.25rem 1.5rem 0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
            Mis Grados {user?.rol === 'director' ? '(Todos)' : ''}
          </div>

          {grados.map((grado) => (
            <li key={grado.id} style={{ marginBottom: '0.25rem' }}>
              <NavLink 
                to={`/dashboard/grado/${grado.id}`}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1.5rem',
                  color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                  borderLeft: isActive ? '4px solid var(--secondary)' : '4px solid transparent',
                  fontWeight: isActive ? 600 : 400,
                  transition: 'all 0.2s',
                  textDecoration: 'none'
                })}
              >
                {grado.nivel === 'inicial' ? <UserSquare2 size={18} /> : <Users size={18} />}
                <span>{grado.nombre}</span>
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
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1.5rem',
                      color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                      backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                      borderLeft: isActive ? '4px solid var(--secondary)' : '4px solid transparent',
                      fontWeight: isActive ? 600 : 400,
                      transition: 'all 0.2s',
                      textDecoration: 'none'
                    })}
                  >
                    <Calendar size={20} />
                    <span>Feriados / Calendario</span>
                  </NavLink>
                </li>
              </>
            )}
          </ul>
        </nav>
        
        {/* User profile section at bottom is handled by Header now */}
      </aside>
    );
  };
  
  export default Sidebar;
