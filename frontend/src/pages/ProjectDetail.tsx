import React, { useState, useEffect, useCallback, useId } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Project, Collaborator, Invitation, Role } from '../types';
import { Modal } from '../components/Modal';
import {
  ArrowLeft,
  Calendar,
  User as UserIcon,
  Users,
  Mail,
  Plus,
  Copy,
  Check,
  Ban,
  Loader2,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<number | ''>('');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const roleSelectId = useId();
  const expiresInputId = useId();

  const isOwner = project?.owner === user?.id;

  const loadProjectData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);

      const [projRes, collRes, rolesRes] = await Promise.all([
        api.get<Project>(`/proyectos/${id}/`),
        api.get<Collaborator[]>(`/proyectos/${id}/collaborators/`),
        api.get<Role[]>('/roles/'),
      ]);

      setProject(projRes.data);
      setCollaborators(collRes.data);
      setRoles(rolesRes.data);

      if (rolesRes.data.length > 0 && rolesRes.data[0]?.id) {
        setSelectedRoleId(rolesRes.data[0].id);
      }

      if (projRes.data.owner === user?.id) {
        try {
          const invRes = await api.get<Invitation[]>(`/proyectos/${id}/invitaciones/`);
          setInvitations(invRes.data);
        } catch {
          // ignore if invitations endpoint is restricted
        }
      }
    } catch {
      setError('No se pudo cargar la información del proyecto.');
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    void loadProjectData();
  }, [loadProjectData]);

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoleId) {
      setInviteError('Por favor selecciona un rol para la invitación.');
      return;
    }

    try {
      setInviteSubmitting(true);
      setInviteError(null);
      const res = await api.post<{ token: string; invitation_url?: string }>(
        `/proyectos/${id}/invitaciones/`,
        {
          role_id: Number(selectedRoleId),
          expires_in_days: expiresInDays,
        }
      );

      const token = res.data.token;
      const fullUrl = `${window.location.origin}/invitaciones/${token}`;
      setGeneratedLink(fullUrl);

      const invRes = await api.get<Invitation[]>(`/proyectos/${id}/invitaciones/`);
      setInvitations(invRes.data);
    } catch {
      setInviteError('Error al generar la invitación. Verifica los datos.');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleCancelInvitation = async (token: string) => {
    try {
      await api.post(`/invitaciones/${token}/cancelar/`);
      setInvitations((prev) =>
        prev.map((inv) => (inv.token === token ? { ...inv, status: 'CANCELADA' } : inv))
      );
    } catch {
      setError('No se pudo cancelar la invitación.');
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 0',
          gap: '12px',
        }}
      >
        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--primary)' }} aria-hidden="true" />
        <p style={{ color: 'var(--text-secondary)' }}>Cargando detalles del proyecto…</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <AlertCircle size={40} style={{ color: 'var(--error)', marginBottom: '14px' }} aria-hidden="true" />
        <h2 style={{ marginBottom: '8px' }}>Error</h2>
        <p style={{ marginBottom: '24px', color: 'var(--text-secondary)' }}>{error ?? 'Proyecto no encontrado.'}</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate('/proyectos')}
        >
          Volver a Mis Proyectos
        </button>
      </div>
    );
  }

  const createdDate = new Date(project.created_at).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div>
      {/* Back button */}
      <div style={{ marginBottom: '20px' }}>
        <Link
          to="/proyectos"
          className="btn btn-ghost"
          style={{ paddingLeft: '8px' }}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Volver a Mis Proyectos</span>
        </Link>
      </div>

      {/* Project Header Card */}
      <div className="card" style={{ marginBottom: '28px', padding: '28px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
            marginBottom: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h1 style={{ fontSize: '1.75rem', margin: 0 }}>{project.name}</h1>
              <span className={`badge ${isOwner ? 'badge-primary' : 'badge-neutral'}`}>
                {isOwner ? 'Propietario' : 'Colaborador'}
              </span>
            </div>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', maxWidth: '750px', margin: 0 }}>
              {project.description || 'Sin descripción detallada.'}
            </p>
          </div>

          {isOwner && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setGeneratedLink(null);
                setInviteError(null);
                setIsInviteOpen(true);
              }}
            >
              <Plus size={16} aria-hidden="true" />
              <span>Invitar Colaborador</span>
            </button>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
            paddingTop: '16px',
            borderTop: '1px solid var(--secondary-border-subtle)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={15} aria-hidden="true" />
            <span className="tabular-nums">Creado el {createdDate}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UserIcon size={15} aria-hidden="true" />
            <span>Propietario: {project.owner_email}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={15} aria-hidden="true" />
            <span className="tabular-nums">{collaborators.length + 1} miembros</span>
          </div>
        </div>
      </div>

      {/* UML Canvas Workspace Banner */}
      <div
        className="card"
        style={{
          marginBottom: '28px',
          padding: '40px 24px',
          textAlign: 'center',
          backgroundColor: 'var(--bg-container)',
          border: '1px dashed var(--secondary-border)',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            backgroundColor: 'var(--primary-subtle)',
            color: 'var(--primary-hover)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            border: '1px solid var(--secondary-border)',
          }}
        >
          <Layers size={30} aria-hidden="true" />
        </div>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>Lienzo de Modelado UML 2.5</h2>
        <p style={{ maxWidth: '540px', margin: '0 auto 24px auto', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Espacio colaborativo de diseño para diagramas de clases, paquetes y componentes
          sincronizado con este proyecto.
        </p>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => alert('El editor de diagramas interactivo se activará en el módulo correspondiente.')}
        >
          <Sparkles size={16} aria-hidden="true" />
          <span>Iniciar Espacio de Modelado</span>
        </button>
      </div>

      {/* Grid: Colaboradores & Invitaciones */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isOwner ? '1fr 1fr' : '1fr',
          gap: '24px',
        }}
      >
        {/* Colaboradores Activos */}
        <div className="card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '18px',
              paddingBottom: '14px',
              borderBottom: '1px solid var(--secondary-border-subtle)',
            }}
          >
            <Users size={18} style={{ color: 'var(--primary-hover)' }} aria-hidden="true" />
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Colaboradores Activos</h2>
            <span className="badge badge-neutral tabular-nums" style={{ marginLeft: 'auto' }}>
              {collaborators.length + 1}
            </span>
          </div>

          {/* Owner row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: 'var(--radius-control)',
              backgroundColor: 'rgba(112, 90, 191, 0.12)',
              border: '1px solid var(--primary)',
              marginBottom: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: 'var(--radius-control)',
                  backgroundColor: 'var(--primary)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  flexShrink: 0,
                }}
              >
                P
              </div>
              <div style={{ minWidth: 0 }}>
                <p className="truncate" style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>
                  {project.owner_email}
                </p>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Propietario / Creador</span>
              </div>
            </div>
            <span className="badge badge-primary">Creador</span>
          </div>

          {/* Collaborator rows */}
          {collaborators.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>
              No hay otros colaboradores en este proyecto aún.
            </p>
          ) : (
            collaborators.map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-control)',
                  border: '1px solid var(--secondary-border-subtle)',
                  backgroundColor: 'var(--bg-input)',
                  marginBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: 'var(--radius-control)',
                      backgroundColor: 'rgba(70, 59, 140, 0.3)',
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      flexShrink: 0,
                      border: '1px solid var(--secondary-border)',
                    }}
                  >
                    {c.user_email.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p className="truncate" style={{ fontSize: '0.9rem', fontWeight: 500, margin: 0 }}>
                      {c.user_email}
                    </p>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      Unido el {new Date(c.joined_at).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                </div>
                <span className="badge badge-neutral">{c.role_name}</span>
              </div>
            ))
          )}
        </div>

        {/* Invitaciones Generadas (Solo Propietario) */}
        {isOwner && (
          <div className="card">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '18px',
                paddingBottom: '14px',
                borderBottom: '1px solid var(--secondary-border-subtle)',
              }}
            >
              <Mail size={18} style={{ color: 'var(--primary-hover)' }} aria-hidden="true" />
              <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Invitaciones de Acceso</h2>
              <span className="badge badge-neutral tabular-nums" style={{ marginLeft: 'auto' }}>
                {invitations.length}
              </span>
            </div>

            {invitations.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>
                No se han generado enlaces de invitación para este proyecto.
              </p>
            ) : (
              invitations.map((inv) => {
                const isPending = inv.status === 'PENDIENTE' && !inv.is_expired;
                const badgeClass =
                  inv.status === 'ACEPTADA'
                    ? 'badge-success'
                    : inv.status === 'CANCELADA' || inv.status === 'RECHAZADA'
                    ? 'badge-error'
                    : inv.is_expired
                    ? 'badge-neutral'
                    : 'badge-primary';

                return (
                  <div
                    key={inv.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-control)',
                      border: '1px solid var(--secondary-border-subtle)',
                      backgroundColor: 'var(--bg-input)',
                      marginBottom: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          Rol: {inv.role_name}
                        </span>
                        <span className={`badge ${badgeClass}`}>
                          {inv.is_expired && inv.status === 'PENDIENTE' ? 'Expirada' : inv.status}
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.76rem',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <Clock size={13} aria-hidden="true" />
                        <span className="tabular-nums">
                          Expira: {new Date(inv.expires_at).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isPending && (
                        <>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                            onClick={() => {
                              const link = `${window.location.origin}/invitaciones/${inv.token}`;
                              void navigator.clipboard.writeText(link);
                              alert('Enlace copiado al portapapeles.');
                            }}
                            title="Copiar enlace de invitación"
                            aria-label={`Copiar enlace de invitación para rol ${inv.role_name}`}
                          >
                            <Copy size={14} aria-hidden="true" />
                            <span>Copiar</span>
                          </button>

                          <button
                            type="button"
                            className="btn btn-danger"
                            style={{ padding: '6px 8px' }}
                            onClick={() => handleCancelInvitation(inv.token)}
                            title="Cancelar invitación"
                            aria-label={`Cancelar invitación para rol ${inv.role_name}`}
                          >
                            <Ban size={14} aria-hidden="true" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Modal Invitar Colaborador */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => {
          if (!inviteSubmitting) setIsInviteOpen(false);
        }}
        title="Generar Invitación al Proyecto"
      >
        {generatedLink ? (
          <div>
            <div className="alert alert-success" role="alert" aria-live="polite">
              <Check size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
              <span>¡Enlace generado exitosamente! Comparte este enlace con tu colega:</span>
            </div>

            <div className="form-group" style={{ marginBottom: '22px' }}>
              <label className="form-label" htmlFor="invitation-link-input">
                Enlace de Acceso
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  id="invitation-link-input"
                  type="text"
                  className="form-input"
                  readOnly
                  value={generatedLink}
                  style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCopyLink}
                  aria-label="Copiar enlace al portapapeles"
                >
                  {copiedLink ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                  <span>{copiedLink ? '¡Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsInviteOpen(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateInvitation} noValidate>
            {inviteError && (
              <div className="alert alert-error" role="alert" aria-live="polite">
                <AlertCircle size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
                <span>{inviteError}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor={roleSelectId}>
                Rol Asignado
              </label>
              <select
                id={roleSelectId}
                className="form-select"
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(Number(e.target.value))}
                required
                disabled={inviteSubmitting}
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id} style={{ backgroundColor: 'var(--bg-container)' }}>
                    {r.name} ({r.permissions.length} permisos)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label" htmlFor={expiresInputId}>
                Vigencia del enlace (días)
              </label>
              <input
                id={expiresInputId}
                type="number"
                min={1}
                max={60}
                className="form-input tabular-nums"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Math.max(1, Math.min(60, Number(e.target.value))))}
                required
                disabled={inviteSubmitting}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsInviteOpen(false)}
                disabled={inviteSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={inviteSubmitting}
              >
                {inviteSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                    <span>Generando enlace…</span>
                  </>
                ) : (
                  'Generar Enlace'
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
export default ProjectDetail;
