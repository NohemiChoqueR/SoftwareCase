import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { PublicInvitation } from '../types';
import {
  Layers,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  FolderGit2,
  ShieldCheck,
  User as UserIcon,
  Calendar,
  LogIn,
} from 'lucide-react';

export const InvitationAccept: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [invitation, setInvitation] = useState<PublicInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) return;
      try {
        setLoading(true);
        setError(null);
        const res = await api.get<PublicInvitation>(`/invitaciones/${token}/`);
        setInvitation(res.data);
      } catch {
        setError('El enlace de invitación no es válido o ha expirado.');
      } finally {
        setLoading(false);
      }
    };

    void fetchInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    try {
      setActionLoading(true);
      setError(null);
      await api.post(`/invitaciones/${token}/aceptar/`);
      setActionSuccess('¡Has aceptado la invitación con éxito! Redirigiendo al proyecto…');
      setTimeout(() => {
        if (invitation?.project_id) {
          navigate(`/proyectos/${invitation.project_id}`);
        } else {
          navigate('/proyectos');
        }
      }, 1500);
    } catch {
      setError('No se pudo procesar la aceptación. Es posible que ya seas miembro o la invitación haya expirado.');
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!token) return;
    try {
      setActionLoading(true);
      setError(null);
      await api.post(`/invitaciones/${token}/rechazar/`);
      setActionSuccess('Has declinado la invitación.');
      setTimeout(() => {
        navigate('/proyectos');
      }, 1500);
    } catch {
      setError('No se pudo rechazar la invitación.');
      setActionLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        backgroundColor: 'var(--bg-page)',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '540px',
          padding: '40px 32px',
          textAlign: 'center',
        }}
      >
        {/* Branding */}
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            backgroundColor: 'var(--primary)',
            color: '#FFFFFF',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            boxShadow: '0 4px 16px rgba(112, 90, 191, 0.4)',
          }}
        >
          <Layers size={28} aria-hidden="true" />
        </div>

        <h1 style={{ fontSize: '1.6rem', marginBottom: '8px' }}>Invitación a UMLForge</h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '28px' }}>
          Has recibido una invitación para colaborar en un proyecto de arquitectura UML 2.5
        </p>

        {loading ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '30px 0',
              gap: '12px',
            }}
          >
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} aria-hidden="true" />
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Verificando enlace de invitación…</p>
          </div>
        ) : error ? (
          <div>
            <div className="alert alert-error" role="alert" aria-live="polite">
              <AlertCircle size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
            <div style={{ marginTop: '20px' }}>
              <Link to="/proyectos" className="btn btn-primary">
                Ir a Mis Proyectos
              </Link>
            </div>
          </div>
        ) : actionSuccess ? (
          <div className="alert alert-success" role="alert" aria-live="polite">
            <CheckCircle2 size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
            <span>{actionSuccess}</span>
          </div>
        ) : invitation ? (
          <div>
            {/* Project Box */}
            <div
              style={{
                backgroundColor: 'var(--bg-input)',
                borderRadius: 'var(--radius-control)',
                padding: '22px',
                border: '1px solid var(--secondary-border)',
                marginBottom: '28px',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <FolderGit2 size={20} style={{ color: 'var(--primary-hover)' }} aria-hidden="true" />
                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{invitation.project_name}</h2>
              </div>

              {invitation.project_description && (
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  {invitation.project_description}
                </p>
              )}

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)',
                  borderTop: '1px solid var(--secondary-border-subtle)',
                  paddingTop: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={15} aria-hidden="true" />
                  <span>
                    Rol asignado:{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>{invitation.role_name}</strong>
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserIcon size={15} aria-hidden="true" />
                  <span>Invitado por: {invitation.inviter_name}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={15} aria-hidden="true" />
                  <span className="tabular-nums">
                    Válido hasta el {new Date(invitation.expires_at).toLocaleDateString('es-ES')}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            {!user ? (
              <div>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Debes iniciar sesión con tu cuenta para unirte al proyecto:
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <Link
                    to="/login"
                    state={{ from: { pathname: `/invitaciones/${token}` } }}
                    className="btn btn-primary"
                  >
                    <LogIn size={16} aria-hidden="true" />
                    <span>Iniciar Sesión</span>
                  </Link>
                  <Link to="/register" className="btn btn-secondary">
                    <span>Crear Cuenta</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '14px', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleReject}
                  disabled={actionLoading}
                >
                  <XCircle size={16} aria-hidden="true" />
                  <span>Rechazar</span>
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAccept}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                      <span>Aceptando…</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} aria-hidden="true" />
                      <span>Aceptar y Unirme</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
export default InvitationAccept;
