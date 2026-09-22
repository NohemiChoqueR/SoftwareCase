import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import type { Project } from '../types';
import { FolderGit2, ShieldCheck, User as UserIcon, LogOut, Sparkles, SlidersHorizontal, Mail } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [projectCount, setProjectCount] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!user) {
      setProjectCount(null);
      return;
    }
    const fetchCount = async () => {
      try {
        const res = await api.get<Project[]>('/proyectos/');
        if (isMounted && Array.isArray(res.data)) {
          setProjectCount(res.data.length);
        }
      } catch {
        // ignore
      }
    };
    void fetchCount();
    return () => {
      isMounted = false;
    };
  }, [user, location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    {
      to: '/proyectos',
      label: 'Proyectos',
      icon: FolderGit2,
      badge: projectCount !== null ? String(projectCount) : undefined,
    },
    { to: '/invitaciones', label: 'Invitaciones', icon: Mail },
    { to: '/roles', label: 'Roles y Permisos', icon: ShieldCheck },
    { to: '/perfil', label: 'Mi Perfil', icon: UserIcon },
  ];

  const getBreadcrumbTitle = () => {
    if (location.pathname.startsWith('/proyectos/')) return 'Detalle de Proyecto';
    if (location.pathname === '/proyectos') return 'Proyectos';
    if (location.pathname === '/invitaciones') return 'Invitaciones';
    if (location.pathname === '/roles') return 'Roles y Permisos';
    if (location.pathname === '/perfil') return 'Mi Perfil';
    return 'Dashboard';
  };

  const userInitials = user?.first_name && user?.last_name
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'JP';

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-page)',
      }}
    >
      {/* Sidebar Navigation */}
      <aside
        style={{
          width: '260px',
          backgroundColor: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--secondary-border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        {/* Brand */}
        <div
          style={{
            padding: '26px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(139, 92, 246, 0.4)',
              flexShrink: 0,
            }}
          >
            <Sparkles size={22} aria-hidden="true" />
          </div>
          <div>
            <span
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                display: 'block',
                lineHeight: 1.2,
              }}
            >
              UMLForge
            </span>
            <span
              style={{
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                display: 'block',
                marginTop: '3px',
              }}
            >
              Modelado UML 2.5
            </span>
          </div>
        </div>

        {/* Section Header */}
        <div style={{ padding: '8px 20px 6px 20px' }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: 'var(--text-category)',
              textTransform: 'uppercase',
            }}
          >
            ESPACIO DE TRABAJO
          </span>
        </div>

        {/* Navigation Items */}
        <nav
          aria-label="Navegación principal"
          style={{
            flex: 1,
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  fontSize: '0.92rem',
                  fontWeight: isActive ? 600 : 500,
                  textDecoration: 'none',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'rgba(124, 92, 252, 0.16)' : 'transparent',
                  border: isActive ? '1px solid var(--primary)' : '1px solid transparent',
                  transition: 'background-color var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast)',
                })}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Icon size={19} aria-hidden="true" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      backgroundColor: '#352D54',
                      color: 'var(--accent-purple)',
                      padding: '2px 8px',
                      borderRadius: '10px',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div
          style={{
            padding: '18px 16px',
            borderTop: '1px solid var(--secondary-border-subtle)',
            backgroundColor: 'var(--bg-sidebar)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#2B2544',
                  color: 'var(--accent-purple)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  border: '1px solid var(--secondary-border)',
                  flexShrink: 0,
                }}
              >
                {userInitials}
              </div>
              <div style={{ minWidth: 0 }}>
                <p
                  className="truncate"
                  style={{
                    fontSize: '0.86rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    margin: 0,
                  }}
                >
                  {user?.first_name ? `${user.first_name} ${user.last_name}`.trim() : user?.email?.split('@')[0]}
                </p>
                <p
                  className="truncate"
                  style={{
                    fontSize: '0.74rem',
                    color: 'var(--text-secondary)',
                    margin: 0,
                  }}
                >
                  {user?.email}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn-ghost"
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              style={{
                padding: '8px',
                borderRadius: 'var(--radius-control)',
                color: 'var(--text-secondary)',
              }}
            >
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          backgroundColor: 'var(--bg-page)',
        }}
      >
        {/* Top Breadcrumb Bar */}
        <header
          style={{
            padding: '20px 36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--secondary-border-subtle)',
          }}
        >
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Workspace</span>
            <span style={{ color: 'var(--text-category)' }}>/</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{getBreadcrumbTitle()}</span>
          </div>

          {/* Right Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              type="button"
              className="btn-ghost"
              aria-label="Filtros y opciones de workspace"
              style={{
                padding: '6px',
                borderRadius: '8px',
                color: 'var(--text-secondary)',
              }}
            >
              <SlidersHorizontal size={17} aria-hidden="true" />
            </button>

            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                backgroundColor: '#2B2544',
                color: 'var(--accent-purple)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '0.82rem',
                border: '1px solid var(--secondary-border)',
              }}
              title={user?.email}
            >
              {userInitials}
            </div>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '36px',
          }}
        >
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
export default AppLayout;
