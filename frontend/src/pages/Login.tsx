import React, { useState, useId } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HeroIllustration } from '../components/HeroIllustration';
import { Eye, EyeOff, Loader2, AlertCircle, ArrowRight, Layers, CheckCircle2 } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname ?? '/proyectos';

  const emailId = useId();
  const passwordId = useId();
  const rememberMeId = useId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Por favor completa todos los campos requeridos.');
      return;
    }

    try {
      setError(null);
      setLoading(true);
      await login(email.trim(), password);
      setLoginSuccess(true);
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 500);
    } catch {
      setError('Credenciales inválidas. Verifica tu correo y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="login-page-wrapper"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        backgroundColor: 'var(--bg-page)',
      }}
    >
      {/* Split Card Container */}
      <div
        style={{
          width: '100%',
          maxWidth: '960px',
          backgroundColor: 'var(--bg-container)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--secondary-border-subtle)',
          boxShadow: '0 25px 60px -15px rgba(16, 13, 24, 0.7)',
          padding: '16px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.25fr)',
          gap: '28px',
        }}
      >
        {/* Left Side: Hero Card */}
        <div
          style={{
            position: 'relative',
            borderRadius: 'var(--radius-panel)',
            overflow: 'hidden',
            minHeight: '540px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '24px',
          }}
        >
          {/* Vector Twilight Illustration */}
          <HeroIllustration />

          {/* Top Bar inside Hero */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  boxShadow: '0 2px 10px rgba(112, 90, 191, 0.4)',
                }}
              >
                <Layers size={18} aria-hidden="true" />
              </div>
              <span
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: 'var(--text-primary)',
                }}
              >
                UMLForge
              </span>
            </div>

            {/* Back to website button */}
            <button
              type="button"
              onClick={() => navigate('/proyectos')}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(8px)',
                borderRadius: '20px',
                padding: '6px 14px',
                fontSize: '0.78rem',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background-color var(--transition-fast)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.22)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)')}
            >
              <span>Sitio web</span>
              <ArrowRight size={13} aria-hidden="true" />
            </button>
          </div>

          {/* Bottom Content inside Hero */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px',
            }}
          >
            <div style={{ maxWidth: '320px' }}>
              <h2
                style={{
                  fontSize: '1.45rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  lineHeight: 1.3,
                  marginBottom: '8px',
                }}
              >
                Modelado de Software,
                <br />
                Creando Arquitectura
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
                Diagramas colaborativos UML 2.5
              </p>
            </div>

            {/* Carousel Indicators */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              aria-label="Diapositivas de presentación"
            >
              <span
                style={{
                  width: '20px',
                  height: '3px',
                  borderRadius: '2px',
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  display: 'inline-block',
                }}
              />
              <span
                style={{
                  width: '20px',
                  height: '3px',
                  borderRadius: '2px',
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  display: 'inline-block',
                }}
              />
              <span
                style={{
                  width: '28px',
                  height: '3px',
                  borderRadius: '2px',
                  backgroundColor: 'var(--text-primary)',
                  display: 'inline-block',
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Side: Form Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '24px 20px 24px 8px',
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: '28px' }}>
            <h1
              style={{
                fontSize: '1.9rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                marginBottom: '8px',
              }}
            >
              Iniciar sesión
            </h1>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              ¿Aún no tienes una cuenta?{' '}
              <Link
                to="/register"
                style={{
                  color: 'var(--primary)',
                  fontWeight: 500,
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                }}
              >
                Regístrate aquí
              </Link>
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="alert alert-error" role="alert" aria-live="polite">
              <AlertCircle size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {loginSuccess && user && (
            <div
              style={{
                backgroundColor: 'rgba(46, 125, 50, 0.2)',
                border: '1px solid #4caf50',
                color: '#a5d6a7',
                padding: '12px 14px',
                borderRadius: 'var(--radius-control)',
                marginBottom: '18px',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              role="status"
              aria-live="polite"
            >
              <CheckCircle2 size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
              <span>
                ¡Bienvenido/a, <strong>{user.first_name || user.email}</strong>! Sesión autenticada con éxito.
              </span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor={emailId}>
                Correo electrónico
              </label>
              <input
                id={emailId}
                name="email"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ej. juan@gmail.com…"
                autoComplete="email"
                spellCheck={false}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor={passwordId}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id={passwordId}
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingRight: '44px' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña…"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: '4px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                >
                  {showPassword ? (
                    <EyeOff size={18} aria-hidden="true" />
                  ) : (
                    <Eye size={18} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {/* Checkbox and Forgot Password */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '24px',
              }}
            >
              <label htmlFor={rememberMeId} className="custom-checkbox-label">
                <input
                  id={rememberMeId}
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                />
                <span>Recordar sesión</span>
              </label>

              <button
                type="button"
                onClick={() => alert('Función de recuperación disponible próximamente.')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'color var(--transition-fast)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginBottom: '24px' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                  <span>Iniciando sesión…</span>
                </>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>

          {/* Social Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                flex: 1,
                height: '1px',
                backgroundColor: 'var(--secondary-border)',
                opacity: 0.6,
              }}
            />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'lowercase' }}>
              o continúa con
            </span>
            <div
              style={{
                flex: 1,
                height: '1px',
                backgroundColor: 'var(--secondary-border)',
                opacity: 0.6,
              }}
            />
          </div>

          {/* Social Buttons */}
          <div style={{ display: 'flex', gap: '14px' }}>
            <button
              type="button"
              className="btn-social"
              onClick={() => alert('Inicio con Google se integrará en el módulo OAuth.')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M12 5c1.54 0 2.89.55 3.96 1.45l2.97-2.97C17.11 1.8 14.73 1 12 1 7.42 1 3.53 3.63 1.67 7.45l3.66 2.84C6.21 7.23 8.85 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.7 2.87c2.16-1.99 3.72-4.94 3.72-8.69z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.33 14.71c-.24-.71-.38-1.47-.38-2.26s.14-1.55.38-2.26L1.67 7.35C.61 9.47 0 11.88 0 14.45s.61 4.98 1.67 7.1l3.66-2.84z"
                />
                <path
                  fill="#34A853"
                  d="M12 23.45c3.24 0 5.95-1.08 7.93-2.91l-3.7-2.87c-1.08.72-2.45 1.16-4.23 1.16-3.15 0-5.79-2.23-6.67-5.29L1.67 16.38C3.53 20.2 7.42 22.83 12 22.83z"
                />
              </svg>
              <span>Google</span>
            </button>

            <button
              type="button"
              className="btn-social"
              onClick={() => alert('Inicio con GitHub se integrará en el módulo OAuth.')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>GitHub</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
