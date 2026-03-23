import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useResponsive } from '../hooks/useResponsive';
import { LogOut, Menu, User } from 'lucide-react';
import MobileMenu from './MobileMenu';

const Header = () => {
  const { user, logout } = useAuth();
  const { isMobile } = useResponsive();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="flex justify-between items-center" style={{ 
        backgroundColor: '#fff', 
        padding: '1rem 1.5rem', 
        borderBottom: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)',
        position: 'sticky',
        top: 0,
        zIndex: 40
      }}>
        
        <div className="flex items-center gap-4">
          {isMobile ? (
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="btn btn-secondary"
              style={{ padding: '0.4rem', border: 'none' }}
              aria-label="Menu"
            >
              <Menu size={24} color="var(--primary)" />
            </button>
          ) : (
            <h2 className="text-xl font-heading text-primary m-0" style={{ fontWeight: 700 }}>
              I.E N°22760
            </h2>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2" style={{ backgroundColor: '#F8FAFC', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-color)' }}>
            <div style={{ backgroundColor: 'var(--primary-light)', color: 'white', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={16} />
            </div>
            <span className="font-medium text-sm text-main" style={{ display: isMobile ? 'none' : 'block' }}>
              {user?.nombres} {user?.apellidos}
            </span>
            <span className="font-medium text-sm text-main hide-on-pc" style={{ display: !isMobile ? 'none' : 'block' }}>
              {user?.nombres?.split(' ')[0]} {/* First name only on mobile */}
            </span>
            <span className="badge" style={{ backgroundColor: 'var(--primary)', color: 'white', fontSize: '0.65rem', marginLeft: '0.25rem' }}>
              {user?.rol === 'director' ? 'DIR' : 'DOC'}
            </span>
          </div>
          
          {!isMobile && (
            <button 
              onClick={logout} 
              className="btn btn-secondary"
              style={{ padding: '0.5rem', borderRadius: '50%', color: 'var(--status-absent)' }}
              title="Cerrar Sesión"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </header>

      {/* Mobile Menu Off-Canvas */}
      <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </>
  );
};

export default Header;
