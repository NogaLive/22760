import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { User, Lock, Building2, ChevronRight, ShieldCheck, Clock } from 'lucide-react';

const Login = () => {
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dni || !password) return;
    
    setIsLoading(true);
    const result = await login(dni, password);
    setIsLoading(false);
    
    if (result.success) {
      navigate('/dashboard');
    }
  };

  const containerStyle = {
    display: 'flex',
    minHeight: '100vh',
    width: '100%',
    backgroundColor: '#ffffff',
    fontFamily: 'var(--font-sans)',
    overflow: 'hidden'
  };

  const leftPanelStyle = {
    display: isMobile ? 'none' : 'flex',
    width: '45%',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '3rem 4rem',
    position: 'relative',
    background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
    color: 'white',
    overflow: 'hidden'
  };

  const rightPanelStyle = {
    width: isMobile ? '100%' : '55%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    position: 'relative'
  };

  const inputContainerStyle = (isFocused, hasValue) => ({
    position: 'relative',
    marginBottom: '1.5rem',
    width: '100%'
  });

  const labelStyle = (isFocused, hasValue) => ({
    position: 'absolute',
    left: '2.7rem',
    top: isFocused || hasValue ? '0.5rem' : '1rem',
    fontSize: isFocused || hasValue ? '0.75rem' : '0.875rem',
    fontWeight: isFocused || hasValue ? '700' : '500',
    color: isFocused ? 'var(--primary)' : '#94A3B8',
    transition: 'all 0.2s ease',
    pointerEvents: 'none',
    zIndex: 10
  });

  const inputStyle = (isFocused) => ({
    width: '100%',
    padding: '1.5rem 1rem 0.5rem 2.8rem',
    backgroundColor: '#ffffff',
    border: `2px solid ${isFocused ? 'var(--primary)' : '#E2E8F0'}`,
    borderRadius: '0.75rem',
    outline: 'none',
    fontSize: '0.95rem',
    color: 'var(--text-main)',
    transition: 'all 0.3s ease',
    boxShadow: isFocused ? '0 0 0 4px rgba(31, 78, 121, 0.1)' : '0 1px 2px rgba(0,0,0,0.05)'
  });

  const iconStyle = (isFocused) => ({
    position: 'absolute',
    left: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: isFocused ? 'var(--primary)' : '#94A3B8',
    transition: 'color 0.2s ease',
    zIndex: 10
  });

  const buttonStyle = {
    marginTop: '1rem',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '1rem',
    backgroundColor: 'var(--primary)',
    color: 'white',
    border: 'none',
    borderRadius: '0.75rem',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: isLoading || !dni || !password ? 'not-allowed' : 'pointer',
    opacity: isLoading || !dni || !password ? 0.7 : 1,
    boxShadow: '0 4px 14px 0 rgba(31,78,121,0.39)',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden'
  };

  return (
    <div style={containerStyle} className="animate-fade-in">
      
      {/* LEFT SIDE - Branding & Decorative */}
      <div style={leftPanelStyle}>
        {/* Abstract Background Shapes */}
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '400px', height: '400px', borderRadius: '50%', backgroundColor: '#3b82f6', opacity: 0.15, filter: 'blur(60px)' }}></div>
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '500px', height: '500px', borderRadius: '50%', backgroundColor: '#2dd4bf', opacity: 0.15, filter: 'blur(60px)' }}></div>

        {/* Top Header */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '3rem', height: '3rem', borderRadius: '0.75rem', backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
            <Building2 size={24} color="#ffffff" strokeWidth={1.5} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.025em' }}>I.E N°22760</h2>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Educación Integral</p>
          </div>
        </div>

        {/* Center Content */}
        <div style={{ position: 'relative', zIndex: 10, margin: 'auto 0' }}>
          <span style={{ display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '9999px', backgroundColor: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)', color: '#bfdbfe', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '1.5rem', boxShadow: '0 0 15px rgba(59,130,246,0.3)' }}>
            GESTIÓN ADMINISTRATIVA
          </span>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.5rem', fontFamily: 'var(--font-heading)' }}>
            Control de<br/>
            <span style={{ background: 'linear-gradient(to right, #60a5fa, #5eead4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Asistencia Escolar
            </span>
          </h1>
          <p style={{ fontSize: '1.125rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, maxWidth: '400px', fontWeight: 300 }}>
            Plataforma centralizada para el monitoreo automatizado de ingreso y permanencia estudiantil. Optimiza la gestión educativa con precisión en tiempo real.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)', maxWidth: '350px' }}>
              <div style={{ backgroundColor: 'rgba(59,130,246,0.2)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                <ShieldCheck size={20} color="#93c5fd" />
              </div>
              <div>
                <h4 style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem' }}>Seguridad Absoluta</h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Toda la data protegida bajo estándares JWT.</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)', maxWidth: '350px' }}>
              <div style={{ backgroundColor: 'rgba(20,184,166,0.2)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                <Clock size={20} color="#5eead4" />
              </div>
              <div>
                <h4 style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem' }}>Validación GMT-5</h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Sincronización horaria con alta precisión.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ position: 'relative', zIndex: 10 }}>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500, margin: 0 }}>© {new Date().getFullYear()} Sistema Desarrollado para la I.E N°22760</p>
        </div>
      </div>

      {/* RIGHT SIDE - Login Form */}
      <div style={rightPanelStyle}>
        
        {/* Mobile Logo */}
        {isMobile && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem' }}>
            <div style={{ width: '4rem', height: '4rem', borderRadius: '1rem', background: 'linear-gradient(to top right, var(--primary), #2c5364)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', marginBottom: '1rem' }}>
              <Building2 size={32} color="white" />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--primary)', fontFamily: 'var(--font-heading)' }}>I.E N°22760</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, margin: '0.25rem 0 0 0' }}>Control de Asistencia</p>
          </div>
        )}

        <div style={{ width: '100%', maxWidth: '420px', padding: '0 2rem' }}>
          <div style={{ marginBottom: '2.5rem', textAlign: isMobile ? 'center' : 'left' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.5rem 0', fontFamily: 'var(--font-heading)' }}>Iniciar Sesión</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500, margin: 0 }}>Panel exclusivo para planas docentes y directivas.</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
            
            {/* DNI Input */}
            <div style={inputContainerStyle()}>
              <div style={iconStyle(focusedInput === 'dni' || dni)}>
                <User size={18} />
              </div>
              <label style={labelStyle(focusedInput === 'dni', dni)}>
                Documento de Identidad (DNI)
              </label>
              <input 
                type="number" 
                style={inputStyle(focusedInput === 'dni')}
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                onFocus={() => setFocusedInput('dni')}
                onBlur={() => setFocusedInput(null)}
                maxLength={8}
                required
              />
            </div>

            {/* Password Input */}
            <div style={inputContainerStyle()}>
              <div style={iconStyle(focusedInput === 'password' || password)}>
                <Lock size={18} />
              </div>
              <label style={labelStyle(focusedInput === 'password', password)}>
                Clave de Acceso Temporal
              </label>
              <input 
                type="password" 
                style={inputStyle(focusedInput === 'password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
                maxLength={6}
                required
              />
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={isLoading || !dni || !password}
              style={buttonStyle}
              onMouseOver={(e) => {
                if(!isLoading && dni && password) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(31,78,121,0.23)';
                  e.currentTarget.style.backgroundColor = 'var(--primary-dark)';
                }
              }}
              onMouseOut={(e) => {
                if(!isLoading && dni && password) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 14px 0 rgba(31,78,121,0.39)';
                  e.currentTarget.style.backgroundColor = 'var(--primary)';
                }
              }}
            >
              <span style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isLoading ? (
                  <>
                    <svg style={{ animation: 'spin 1s linear infinite', height: '1.25rem', width: '1.25rem', color: 'white', marginRight: '0.5rem' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verificando Credenciales...
                  </>
                ) : (
                  <>
                    Ingresar a la Plataforma 
                    <ChevronRight size={20} />
                  </>
                )}
              </span>
            </button>
          </form>
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
};

export default Login;
