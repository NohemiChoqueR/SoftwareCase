import React, { useState, useEffect, useMemo, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Project } from '../types';
import { Modal } from '../components/Modal';
import {
  FolderGit2,
  Plus,
  Search,
  Calendar,
  User as UserIcon,
  Trash2,
  ExternalLink,
  Loader2,
  AlertCircle,
  FolderOpen,
  LayoutGrid,
  Users,
  ChevronDown,
} from 'lucide-react';

export const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Modal create state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Modal delete state
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  const searchInputId = useId();
  const createNameId = useId();
  const createDescId = useId();

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<Project[]>('/proyectos/');
      setProjects(res.data);
    } catch {
      setError('No se pudieron cargar los proyectos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProjects();
  }, []);

  const filteredProjects = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }, [projects, searchQuery]);

  const ownedProjectsCount = useMemo(
    () => projects.filter((p) => p.owner === user?.id).length,
    [projects, user]
  );
  const sharedProjectsCount = projects.length - ownedProjectsCount;
  const ownedPercent = projects.length > 0 ? Math.round((ownedProjectsCount / projects.length) * 100) : 0;
  const thisMonthCount = useMemo(() => {
    const now = new Date();
    return projects.filter((p) => {
      const d = new Date(p.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [projects]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      setCreateError('El nombre del proyecto es obligatorio.');
      return;
    }

    try {
      setCreateSubmitting(true);
      setCreateError(null);
      const res = await api.post<Project>('/proyectos/', {
        name: projectName.trim(),
        description: projectDescription.trim(),
      });
      setProjects((prev) => [res.data, ...prev]);
      setIsCreateOpen(false);
      setProjectName('');
      setProjectDescription('');
    } catch {
      setCreateError('Error al crear el proyecto. Verifica los datos ingresados.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      setDeleteSubmitting(true);
      await api.delete(`/proyectos/${projectToDelete.id}/`);
      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
      setProjectToDelete(null);
    } catch {
      setError('Error al eliminar el proyecto.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div>
      {/* Top Header with Dashboard Tag */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        <div>
          {/* Tag */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: 'var(--accent-tag)',
              marginBottom: '8px',
            }}
          >
            <span>•</span>
            <span>DASHBOARD</span>
          </div>

          <h1
            style={{
              fontSize: '2.3rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.03em',
              marginBottom: '8px',
            }}
          >
            Mis Proyectos
          </h1>
          <p style={{ fontSize: '0.94rem', color: 'var(--text-secondary)', margin: 0, maxWidth: '640px' }}>
            Diseña, documenta y comparte la arquitectura de tus productos digitales.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setIsCreateOpen(true)}
          style={{
            padding: '12px 22px',
            fontSize: '0.92rem',
            fontWeight: 600,
            borderRadius: '12px',
            boxShadow: '0 4px 16px rgba(124, 92, 252, 0.35)',
          }}
        >
          <Plus size={18} aria-hidden="true" />
          <span>Nuevo Proyecto</span>
        </button>
      </div>

      {/* 3 Metric Cards matching reference screenshot */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '36px',
        }}
      >
        {/* Card 1: Total de proyectos */}
        <div
          className="card"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '160px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#27223C',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FolderGit2 size={19} aria-hidden="true" />
            </div>
            <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Total de proyectos
            </span>
          </div>

          <div>
            <span
              className="tabular-nums"
              style={{
                fontSize: '2.5rem',
                fontWeight: 700,
                color: 'var(--accent-purple)',
                display: 'block',
                lineHeight: 1.1,
              }}
            >
              {projects.length}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>
              +{thisMonthCount} este mes
            </span>
          </div>
        </div>

        {/* Card 2: Proyectos propios */}
        <div
          className="card"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '160px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#27223C',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <LayoutGrid size={19} aria-hidden="true" />
            </div>
            <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Proyectos propios
            </span>
          </div>

          <div>
            <span
              className="tabular-nums"
              style={{
                fontSize: '2.5rem',
                fontWeight: 700,
                color: 'var(--accent-purple)',
                display: 'block',
                lineHeight: 1.1,
              }}
            >
              {ownedProjectsCount}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>
              {ownedPercent}% del total
            </span>
          </div>
        </div>

        {/* Card 3: Proyectos compartidos (with fresh mint number) */}
        <div
          className="card"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '160px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#27223C',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Users size={19} aria-hidden="true" />
            </div>
            <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Proyectos compartidos
            </span>
          </div>

          <div>
            <span
              className="tabular-nums"
              style={{
                fontSize: '2.5rem',
                fontWeight: 700,
                color: 'var(--accent-green)',
                display: 'block',
                lineHeight: 1.1,
              }}
            >
              {sharedProjectsCount}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>
              Con tu equipo
            </span>
          </div>
        </div>
      </div>

      {/* Section Header: Todos los proyectos */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '1.35rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Todos los proyectos
          </h2>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
            {projects.length} {projects.length === 1 ? 'proyecto' : 'proyectos'} en tu espacio
          </span>
        </div>

        {/* Sort Filter Button matching screenshot */}
        <button
          type="button"
          style={{
            backgroundColor: 'var(--bg-container)',
            border: '1px solid var(--secondary-border)',
            borderRadius: '10px',
            padding: '8px 14px',
            fontSize: '0.84rem',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'border-color var(--transition-fast), color var(--transition-fast)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--primary)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--secondary-border)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <span>Recientes</span>
          <ChevronDown size={15} aria-hidden="true" />
        </button>
      </div>

      {/* Search Input Bar matching reference */}
      <div style={{ marginBottom: '28px', position: 'relative' }}>
        <label htmlFor={searchInputId} className="sr-only" style={{ display: 'none' }}>
          Buscar proyectos por nombre o descripción
        </label>
        <div style={{ position: 'relative' }}>
          <Search
            size={18}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            id={searchInputId}
            type="search"
            className="form-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o descripción..."
            style={{
              paddingLeft: '46px',
              paddingRight: '56px',
              borderRadius: '12px',
            }}
            spellCheck={false}
          />
          <span
            style={{
              position: 'absolute',
              right: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '0.74rem',
              color: 'var(--text-category)',
              backgroundColor: '#1E1A2D',
              border: '1px solid var(--secondary-border)',
              borderRadius: '6px',
              padding: '2px 7px',
              pointerEvents: 'none',
            }}
          >
            ⌘ K
          </span>
        </div>
      </div>

      {/* Global Error */}
      {error && (
        <div className="alert alert-error" role="alert" aria-live="polite">
          <AlertCircle size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Content Grid */}
      {loading ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '70px 0',
            gap: '12px',
          }}
        >
          <Loader2 size={36} className="animate-spin" style={{ color: 'var(--primary)' }} aria-hidden="true" />
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Cargando proyectos…</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '56px 24px',
          }}
        >
          <FolderOpen
            size={52}
            aria-hidden="true"
            style={{ color: 'var(--secondary-border)', marginBottom: '16px' }}
          />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>No se encontraron proyectos</h3>
          <p style={{ maxWidth: '440px', margin: '0 auto 24px auto', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            {searchQuery
              ? 'No hay proyectos que coincidan con el término de búsqueda ingresado.'
              : 'Aún no tienes proyectos creados. Comienza creando tu primer modelo de arquitectura UML.'}
          </p>
          {!searchQuery && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus size={18} aria-hidden="true" />
              <span>Crear mi primer proyecto</span>
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px',
          }}
        >
          {filteredProjects.map((project) => {
            const isOwner = project.owner === user?.id;
            const formattedDate = new Date(project.created_at).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });

            return (
              <div
                key={project.id}
                className="card card-hover"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '18px',
                  minWidth: 0,
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '12px',
                      marginBottom: '14px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          backgroundColor: 'rgba(124, 92, 252, 0.15)',
                          color: 'var(--accent-purple)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          border: '1px solid var(--secondary-border)',
                        }}
                      >
                        <FolderGit2 size={20} aria-hidden="true" />
                      </div>
                      <h3
                        className="truncate"
                        style={{
                          fontSize: '1.1rem',
                          fontWeight: 600,
                          margin: 0,
                        }}
                        title={project.name}
                      >
                        {project.name}
                      </h3>
                    </div>

                    <span
                      className={`badge ${isOwner ? 'badge-primary' : 'badge-neutral'}`}
                      style={{ flexShrink: 0 }}
                    >
                      {isOwner ? 'Propietario' : 'Colaborador'}
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: '0.86rem',
                      lineHeight: 1.5,
                      color: 'var(--text-secondary)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      minHeight: '2.6em',
                      margin: 0,
                    }}
                  >
                    {project.description || 'Sin descripción especificada.'}
                  </p>
                </div>

                <div>
                  {/* Meta info */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.78rem',
                      color: 'var(--text-muted)',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--secondary-border-subtle)',
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} aria-hidden="true" />
                      <span className="tabular-nums">{formattedDate}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UserIcon size={14} aria-hidden="true" />
                      <span className="truncate" style={{ maxWidth: '140px' }} title={project.owner_email}>
                        {project.owner_email}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ flex: 1 }}
                      onClick={() => navigate(`/proyectos/${project.id}`)}
                    >
                      <ExternalLink size={15} aria-hidden="true" />
                      <span>Abrir</span>
                    </button>

                    {isOwner && (
                      <button
                        type="button"
                        className="btn btn-danger"
                        aria-label={`Eliminar proyecto ${project.name}`}
                        title="Eliminar proyecto"
                        style={{ padding: '10px 12px' }}
                        onClick={() => setProjectToDelete(project)}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear Proyecto */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          if (!createSubmitting) {
            setIsCreateOpen(false);
            setCreateError(null);
          }
        }}
        title="Crear Nuevo Proyecto"
      >
        <form onSubmit={handleCreateProject} noValidate>
          {createError && (
            <div className="alert alert-error" role="alert" aria-live="polite">
              <AlertCircle size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
              <span>{createError}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor={createNameId}>
              Nombre del proyecto
            </label>
            <input
              id={createNameId}
              type="text"
              className="form-input"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="ej. Sistema de Gestión Hospitalaria…"
              required
              disabled={createSubmitting}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label" htmlFor={createDescId}>
              Descripción (opcional)
            </label>
            <textarea
              id={createDescId}
              className="form-textarea"
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="Describe el alcance y módulos del proyecto…"
              rows={4}
              disabled={createSubmitting}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsCreateOpen(false)}
              disabled={createSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={createSubmitting}
            >
              {createSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  <span>Creando…</span>
                </>
              ) : (
                'Crear Proyecto'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmar Eliminación */}
      <Modal
        isOpen={Boolean(projectToDelete)}
        onClose={() => {
          if (!deleteSubmitting) setProjectToDelete(null);
        }}
        title="Confirmar Eliminación"
      >
        <div>
          <p style={{ marginBottom: '24px', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
            ¿Estás seguro de que deseas eliminar permanentemente el proyecto{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{projectToDelete?.name}</strong>? Esta
            acción es irreversible y eliminará todos los diagramas y colaboradores asociados.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setProjectToDelete(null)}
              disabled={deleteSubmitting}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDeleteProject}
              disabled={deleteSubmitting}
            >
              {deleteSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  <span>Eliminando…</span>
                </>
              ) : (
                'Eliminar Definitivamente'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default Projects;
