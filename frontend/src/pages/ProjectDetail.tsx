import React, { useState, useEffect, useCallback, useId } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Project, Collaborator, Invitation, Role, Diagram } from '../types';
import { Modal } from '../components/Modal';
import {
  ArrowLeft,
  Calendar,
  User as UserIcon,
  Users,
  Mail,
  Plus,
  Ban,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  Circle,
  Check,
  Sparkles,
  Layers,
  Trash2,
  Box,
} from 'lucide-react';

const PERMISSION_LABELS: Record<string, string> = {
  VIEW_PROJECT: 'Ver proyecto',
  EDIT_PROJECT: 'Editar proyecto',
  DELETE_PROJECT: 'Eliminar proyecto',
  INVITE_COLLABORATOR: 'Invitar colaboradores',
  REMOVE_COLLABORATOR: 'Gestionar colaboradores',
  MANAGE_ROLES: 'Gestionar configuración',
  VIEW_MODEL: 'Ver modelos de datos',
  EDIT_MODEL: 'Editar modelos de datos',
  VALIDATE_MODEL: 'Validar modelos',
  USE_AI: 'Usar Inteligencia Artificial',
  GENERATE_CODE: 'Generar código base',
  GENERATE_BACKEND: 'Generar backend',
  EXPORT_MODEL: 'Exportar modelos',
  IMPORT_MODEL: 'Importar modelos',
};

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

  // Diagrams state
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [isCreateDiagOpen, setIsCreateDiagOpen] = useState(false);
  const [diagName, setDiagName] = useState('');
  const [diagDesc, setDiagDesc] = useState('');
  const [diagSubmitting, setDiagSubmitting] = useState(false);
  const [diagError, setDiagError] = useState<string | null>(null);
  const [diagToDelete, setDiagToDelete] = useState<Diagram | null>(null);
  const [diagDeleteSubmitting, setDiagDeleteSubmitting] = useState(false);

  // Invite modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<number | ''>('');
  const [guestEmail, setGuestEmail] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [showPermissions, setShowPermissions] = useState(false);

  const emailInputId = useId();

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

      // Cargar diagramas del proyecto
      try {
        const diagRes = await api.get<Diagram[]>(`/proyectos/${id}/diagramas/`);
        setDiagrams(diagRes.data);
      } catch {
        // Ignorar si no tiene permiso VIEW_MODEL
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
    if (!selectedRoleId || !guestEmail) {
      setInviteError('Por favor selecciona un rol e ingresa un correo válido.');
      return;
    }

    try {
      setInviteSubmitting(true);
      setInviteError(null);
      await api.post(`/invitaciones/`, {
        project: id,
        role: Number(selectedRoleId),
        guest_email: guestEmail,
      });

      // Recargar lista de invitaciones
      const invRes = await api.get<Invitation[]>(`/proyectos/${id}/invitaciones/`);
      setInvitations(invRes.data);
      
      setIsInviteOpen(false);
      setGuestEmail('');
    } catch (err: any) {
      if (err.response?.data?.guest_email) {
        setInviteError(err.response.data.guest_email[0] || err.response.data.guest_email);
      } else if (err.response?.data?.project) {
        setInviteError(err.response.data.project[0] || err.response.data.project);
      } else {
        setInviteError('Error al enviar la invitación. Verifica los datos.');
      }
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleCancelInvitation = async (invId: number) => {
    try {
      await api.delete(`/invitaciones/${invId}/`);
      setInvitations((prev) =>
        prev.filter((inv) => inv.id !== invId)
      );
    } catch {
      setError('No se pudo cancelar la invitación.');
    }
  };

  const handleCreateDiagram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagName.trim()) {
      setDiagError('El nombre del diagrama es obligatorio.');
      return;
    }

    try {
      setDiagSubmitting(true);
      setDiagError(null);
      const res = await api.post<Diagram>(`/proyectos/${id}/diagramas/`, {
        name: diagName.trim(),
        description: diagDesc.trim(),
      });
      setDiagrams((prev) => [res.data, ...prev]);
      setIsCreateDiagOpen(false);
      setDiagName('');
      setDiagDesc('');
      navigate(`/proyectos/${id}/diagramas/${res.data.id}`);
    } catch {
      setDiagError('Error al crear el diagrama. Verifica los permisos.');
    } finally {
      setDiagSubmitting(false);
    }
  };

  const handleDeleteDiagram = async () => {
    if (!diagToDelete) return;
    try {
      setDiagDeleteSubmitting(true);
      await api.delete(`/diagramas/${diagToDelete.id}/`);
      setDiagrams((prev) => prev.filter((d) => d.id !== diagToDelete.id));
      setDiagToDelete(null);
    } catch {
      setError('No se pudo eliminar el diagrama.');
    } finally {
      setDiagDeleteSubmitting(false);
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
                setGuestEmail('');
                setInviteError(null);
                setShowPermissions(false);
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

      {/* UML Diagrams Section */}
      <div className="card" style={{ marginBottom: '28px', padding: '24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            paddingBottom: '14px',
            borderBottom: '1px solid var(--secondary-border-subtle)',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={20} style={{ color: 'var(--primary-hover)' }} aria-hidden="true" />
            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Diagramas UML 2.5</h2>
            <span className="badge badge-primary tabular-nums">
              {diagrams.length}
            </span>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setDiagError(null);
              setIsCreateDiagOpen(true);
            }}
            style={{ padding: '8px 16px', fontSize: '0.86rem' }}
          >
            <Plus size={16} aria-hidden="true" />
            <span>Nuevo Diagrama</span>
          </button>
        </div>

        {diagrams.length === 0 ? (
          <div
            style={{
              padding: '36px 20px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-input)',
              border: '1px dashed var(--secondary-border)',
              borderRadius: 'var(--radius-control)',
            }}
          >
            <Box size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 12px auto' }} aria-hidden="true" />
            <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '6px' }}>
              Aún no hay diagramas en este proyecto
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto 16px auto' }}>
              Crea tu primer diagrama de clases UML 2.5 para modelar la arquitectura y comenzar a diseñar.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setDiagError(null);
                setIsCreateDiagOpen(true);
              }}
              style={{ fontSize: '0.84rem' }}
            >
              <Plus size={15} aria-hidden="true" />
              <span>Crear Primer Diagrama</span>
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '16px',
            }}
          >
            {diagrams.map((diag) => (
              <div
                key={diag.id}
                className="card card-hover"
                style={{
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--secondary-border)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(124, 92, 252, 0.16)',
                          color: 'var(--primary-hover)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Box size={16} aria-hidden="true" />
                      </div>
                      <h3 className="truncate" style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                        {diag.name}
                      </h3>
                    </div>

                    <span className="badge badge-primary tabular-nums" style={{ fontSize: '0.70rem' }}>
                      v{diag.version}
                    </span>
                  </div>

                  <p className="truncate" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 14px 0' }}>
                    {diag.description || 'Diagrama de clases UML 2.5'}
                  </p>
                </div>

                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      fontSize: '0.76rem',
                      color: 'var(--text-muted)',
                      paddingTop: '10px',
                      borderTop: '1px solid var(--secondary-border-subtle)',
                      marginBottom: '14px',
                    }}
                  >
                    <span className="tabular-nums" style={{ color: 'var(--accent-purple)' }}>
                      {diag.class_count || 0} clases
                    </span>
                    <span>•</span>
                    <span className="tabular-nums" style={{ color: 'var(--accent-green)' }}>
                      {diag.relationship_count || 0} relaciones
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => navigate(`/proyectos/${id}/diagramas/${diag.id}`)}
                      style={{ flex: 1, padding: '8px 12px', fontSize: '0.84rem' }}
                    >
                      <Sparkles size={14} aria-hidden="true" />
                      <span>Abrir Editor</span>
                    </button>

                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setDiagToDelete(diag)}
                      title="Eliminar diagrama"
                      style={{ padding: '8px', color: 'var(--error)' }}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
                const isPending = inv.status === 'PENDING';
                const badgeClass =
                  inv.status === 'ACCEPTED'
                    ? 'badge-success'
                    : inv.status === 'REJECTED'
                    ? 'badge-error'
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
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {inv.guest_email}
                        </span>
                        <span className={`badge ${badgeClass}`}>
                          {inv.status}
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
                          Enviada el {new Date(inv.created_at).toLocaleDateString('es-ES')}
                        </span>
                        <span style={{ margin: '0 4px' }}>•</span>
                        <span>Rol: {inv.role_name}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isPending && (
                        <button
                          type="button"
                          className="btn btn-danger"
                          style={{ padding: '6px 8px' }}
                          onClick={() => handleCancelInvitation(inv.id)}
                          title="Cancelar invitación"
                          aria-label={`Cancelar invitación para ${inv.guest_email}`}
                        >
                          <Ban size={14} aria-hidden="true" />
                        </button>
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
        title="Invitar Colaborador"
      >
        <form onSubmit={handleCreateInvitation} noValidate>
          {inviteError && (
            <div className="alert alert-error" role="alert" aria-live="polite" style={{ marginBottom: '16px' }}>
              <AlertCircle size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
              <span>{inviteError}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor={emailInputId}>
              Correo electrónico
            </label>
            <input
              id={emailInputId}
              type="email"
              className="form-input"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="ejemplo@correo.com"
              required
              disabled={inviteSubmitting}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label" style={{ marginBottom: '8px', display: 'block', color: 'var(--text-secondary)' }}>
              Perfil de acceso
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
              {roles.map((r) => {
                const isSelected = selectedRoleId === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => {
                      if (!inviteSubmitting) setSelectedRoleId(r.id);
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-control)',
                      border: isSelected ? '1px solid var(--primary)' : '1px solid var(--secondary-border-subtle)',
                      backgroundColor: isSelected ? 'rgba(124, 92, 252, 0.08)' : 'var(--bg-input)',
                      cursor: inviteSubmitting ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s cubic-bezier(0.23, 1, 0.32, 1)',
                      opacity: inviteSubmitting ? 0.6 : 1,
                      transform: isSelected ? 'scale(1)' : 'scale(0.99)',
                    }}
                  >
                    <div>
                      <h4 style={{ 
                        margin: '0 0 2px 0', 
                        fontSize: isSelected ? '0.9rem' : '0.85rem', 
                        fontWeight: isSelected ? 600 : 400,
                        color: isSelected ? '#FFFFFF' : 'var(--text-primary)',
                        transition: 'all 0.2s'
                      }}>
                        {r.name}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {r.permissions.length} permisos incluidos
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {isSelected ? (
                        <CheckCircle2 size={18} style={{ color: 'var(--primary)' }} />
                      ) : (
                        <Circle size={18} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--secondary-border-subtle)',
              backgroundColor: 'var(--bg-elevated)',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ margin: '0 0 2px 0', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                  Ver permisos
                </h4>
                <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {roles.find(r => r.id === selectedRoleId)?.permissions.length || 0} permisos incluidos en el rol seleccionado
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={showPermissions}
                onClick={() => setShowPermissions(!showPermissions)}
                style={{
                  width: '36px',
                  height: '20px',
                  borderRadius: '10px',
                  backgroundColor: showPermissions ? 'var(--primary)' : 'var(--bg-input)',
                  border: '1px solid var(--secondary-border)',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s cubic-bezier(0.23, 1, 0.32, 1)',
                  padding: 0,
                }}
              >
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    backgroundColor: '#fff',
                    position: 'absolute',
                    top: '2px',
                    left: showPermissions ? '18px' : '2px',
                    transition: 'left 0.2s cubic-bezier(0.23, 1, 0.32, 1)',
                  }}
                />
              </button>
            </div>

            {showPermissions && selectedRoleId && (
              <div style={{ 
                marginTop: '14px', 
                paddingTop: '14px',
                borderTop: '1px solid var(--secondary-border-subtle)',
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '8px 12px',
                maxHeight: '120px',
                overflowY: 'auto',
                paddingRight: '4px'
              }}>
                {roles.find(r => r.id === selectedRoleId)?.permissions.map((permCode, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(74, 222, 128, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Check size={10} style={{ color: 'var(--accent-green)' }} strokeWidth={3} />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                      {PERMISSION_LABELS[permCode] || permCode}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: '10px',
            position: 'sticky',
            bottom: 0,
            paddingTop: '16px',
            backgroundColor: 'var(--bg-container)',
            borderTop: '1px solid var(--secondary-border-subtle)',
            marginTop: 'auto'
          }}>
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
                  <span>Enviando…</span>
                </>
              ) : (
                <>
                  <Plus size={16} />
                  <span>Enviar invitación</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Crear Diagrama */}
      <Modal
        isOpen={isCreateDiagOpen}
        onClose={() => {
          if (!diagSubmitting) setIsCreateDiagOpen(false);
        }}
        title="Crear Nuevo Diagrama UML"
      >
        <form onSubmit={handleCreateDiagram} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {diagError && (
            <div className="alert alert-error">
              <AlertCircle size={16} aria-hidden="true" />
              <span>{diagError}</span>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Nombre del Diagrama
            </label>
            <input
              type="text"
              placeholder="e.g. Diagrama de Clases del Dominio…"
              value={diagName}
              onChange={(e) => setDiagName(e.target.value)}
              className="form-input"
              autoFocus
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Descripción (Opcional)
            </label>
            <textarea
              placeholder="Detalle o propósito de este diagrama…"
              value={diagDesc}
              onChange={(e) => setDiagDesc(e.target.value)}
              className="form-input"
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid var(--secondary-border-subtle)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsCreateDiagOpen(false)}
              disabled={diagSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={diagSubmitting}
            >
              {diagSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  <span>Creando…</span>
                </>
              ) : (
                <>
                  <Plus size={16} aria-hidden="true" />
                  <span>Crear y Abrir Editor</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Confirmar Eliminación de Diagrama */}
      <Modal
        isOpen={!!diagToDelete}
        onClose={() => {
          if (!diagDeleteSubmitting) setDiagToDelete(null);
        }}
        title="Eliminar Diagrama UML"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0 }}>
            ¿Estás seguro de que deseas eliminar el diagrama{' '}
            <strong style={{ color: 'var(--text-primary)' }}>"{diagToDelete?.name}"</strong>? Esta
            acción eliminará todas sus clases, relaciones y disposición gráfica de forma permanente.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid var(--secondary-border-subtle)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setDiagToDelete(null)}
              disabled={diagDeleteSubmitting}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDeleteDiagram}
              disabled={diagDeleteSubmitting}
            >
              {diagDeleteSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  <span>Eliminando…</span>
                </>
              ) : (
                <>
                  <Trash2 size={16} aria-hidden="true" />
                  <span>Eliminar Diagrama</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default ProjectDetail;
