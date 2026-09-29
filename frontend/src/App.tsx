import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppLayout } from './components/AppLayout';
import { Loader2 } from 'lucide-react';

// Eager load entrypoint authentication pages for instant, reliable loading
import Login from './pages/Login';
import Register from './pages/Register';

// Code splitting for interior application views
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const Roles = lazy(() => import('./pages/Roles'));
const Profile = lazy(() => import('./pages/Profile'));
const Invitations = lazy(() => import('./pages/Invitations'));
const DiagramEditor = lazy(() => import('./pages/DiagramEditor'));

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary captured error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backgroundColor: 'var(--bg-page)',
            color: 'var(--text-primary)',
            textAlign: 'center',
          }}
        >
          <h2 style={{ marginBottom: '12px', fontSize: '1.4rem' }}>Error al cargar la vista</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', maxWidth: '480px' }}>
            {this.state.errorMessage || 'Ocurrió un error inesperado al renderizar este componente.'}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => {
              this.setState({ hasError: false, errorMessage: '' });
              window.location.href = '/login';
            }}
          >
            Volver a Iniciar Sesión
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const PageLoader: React.FC = () => (
  <div
    style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      color: 'var(--text-secondary)',
    }}
  >
    <Loader2 size={36} className="animate-spin" style={{ color: 'var(--primary)' }} aria-hidden="true" />
    <span style={{ fontSize: '0.9rem' }}>Cargando…</span>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode; withLayout?: boolean }> = ({
  children,
  withLayout = true,
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return withLayout ? <AppLayout>{children}</AppLayout> : <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route
            path="/proyectos"
            element={
              <ProtectedRoute>
                <Projects />
              </ProtectedRoute>
            }
          />
          <Route
            path="/proyectos/:id"
            element={
              <ProtectedRoute>
                <ProjectDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/proyectos/:projectId/diagramas/:diagramId"
            element={
              <ProtectedRoute withLayout={false}>
                <DiagramEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invitaciones"
            element={
              <ProtectedRoute>
                <Invitations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/roles"
            element={
              <ProtectedRoute>
                <Roles />
              </ProtectedRoute>
            }
          />
          <Route
            path="/perfil"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="/" element={<Navigate to="/proyectos" replace />} />
          <Route path="*" element={<Navigate to="/proyectos" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

export default App;
