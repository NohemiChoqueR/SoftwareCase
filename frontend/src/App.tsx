import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppLayout } from './components/AppLayout';
import { Loader2 } from 'lucide-react';

// Route-based code splitting per react-vite-best-practices
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const Roles = lazy(() => import('./pages/Roles'));
const Profile = lazy(() => import('./pages/Profile'));
const Invitations = lazy(() => import('./pages/Invitations'));
const DiagramEditor = lazy(() => import('./pages/DiagramEditor'));

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
  );
};

export default App;
