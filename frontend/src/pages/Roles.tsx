import React, { useState, useEffect, useId } from 'react';
import api from '../services/api';
import type { Role, Permission } from '../types';
import { Modal } from '../components/Modal';
import {
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  Check,
  Loader2,
  AlertCircle,
  KeyRound,
} from 'lucide-react';

export const Roles: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Delete modal state
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const roleNameInputId = useId();
  const roleDescInputId = useId();

  const fetchRolesAndPermissions = async () => {
    try {
      setLoading(true);
      setError(null);
      const [rolesRes, permsRes] = await Promise.all([
        api.get<Role[]>('/roles/'),
        api.get<Permission[]>('/roles/permissions/'),
      ]);
      setRoles(rolesRes.data);
      setAvailablePermissions(permsRes.data);
    } catch {
      setError('No se pudieron cargar los roles y permisos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRolesAndPermissions();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleDescription('');
    setSelectedPermissions([]);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (role: Role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description);
    setSelectedPermissions(role.permissions);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleTogglePermission = (code: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code]
    );
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      setModalError('El nombre del rol es obligatorio.');
      return;
    }

    try {
      setModalSubmitting(true);
      setModalError(null);

      const payload = {
        name: roleName.trim(),
        description: roleDescription.trim(),
        permissions_list: selectedPermissions,
      };

      if (editingRole) {
        const res = await api.put<Role>(`/roles/${editingRole.id}/`, payload);
        setRoles((prev) => prev.map((r) => (r.id === editingRole.id ? res.data : r)));
      } else {
        const res = await api.post<Role>('/roles/', payload);
        setRoles((prev) => [...prev, res.data]);
      }

      setIsModalOpen(false);
    } catch {
      setModalError('Error al guardar el rol. Verifica los datos.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;

    try {
      setDeleteSubmitting(true);
      await api.delete(`/roles/${roleToDelete.id}/`);
      setRoles((prev) => prev.filter((r) => r.id !== roleToDelete.id));
      setRoleToDelete(null);
    } catch {
      setError('Error al eliminar el rol.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '6px' }}>Roles y Permisos</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Administración de perfiles y control de acceso granular en los proyectos
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleOpenCreateModal}
        >
          <Plus size={18} aria-hidden="true" />
          <span>Crear Rol Personalizado</span>
        </button>
      </div>

      {/* Global Error */}
      {error && (
        <div className="alert alert-error" role="alert" aria-live="polite">
          <AlertCircle size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
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
          <p style={{ color: 'var(--text-secondary)' }}>Cargando roles y permisos…</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '24px',
          }}
        >
          {roles.map((role) => (
            <div
              key={role.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: 'var(--radius-control)',
                        backgroundColor: 'var(--primary-subtle)',
                        color: 'var(--primary-hover)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: '1px solid var(--secondary-border)',
                      }}
                    >
                      <ShieldCheck size={20} aria-hidden="true" />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.15rem', margin: 0 }}>{role.name}</h2>
                      <span
                        className="tabular-nums"
                        style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}
                      >
                        {role.permissions.length} permisos asignados
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => handleOpenEditModal(role)}
                      aria-label={`Editar rol ${role.name}`}
                      style={{ padding: '8px', borderRadius: 'var(--radius-control)' }}
                    >
                      <Edit2 size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setRoleToDelete(role)}
                      aria-label={`Eliminar rol ${role.name}`}
                      style={{ padding: '8px', borderRadius: 'var(--radius-control)', color: '#ff9b9b' }}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <p
                  style={{
                    fontSize: '0.86rem',
                    lineHeight: 1.5,
                    color: 'var(--text-secondary)',
                    marginBottom: '16px',
                    minHeight: '2.5em',
                  }}
                >
                  {role.description || 'Sin descripción especificada.'}
                </p>

                {/* Permissions Chips */}
                <div
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderRadius: 'var(--radius-control)',
                    padding: '14px',
                    border: '1px solid var(--secondary-border-subtle)',
                    marginBottom: '16px',
                  }}
                >
                  <p
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: 'var(--text-secondary)',
                      marginBottom: '10px',
                    }}
                  >
                    Permisos Asignados
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {role.permissions.length === 0 ? (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        Ningún permiso activo.
                      </span>
                    ) : (
                      role.permissions.map((permCode) => {
                        const permObj = availablePermissions.find((p) => p.code === permCode);
                        return (
                          <span
                            key={permCode}
                            className="badge badge-primary"
                            style={{ fontSize: '0.72rem', textTransform: 'none' }}
                          >
                            <Check size={11} aria-hidden="true" />
                            <span>{permObj?.name ?? permCode}</span>
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  borderTop: '1px solid var(--secondary-border-subtle)',
                  paddingTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <KeyRound size={13} aria-hidden="true" />
                <span className="tabular-nums">
                  Registrado el {new Date(role.created_at).toLocaleDateString('es-ES')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear / Editar Rol */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (!modalSubmitting) setIsModalOpen(false);
        }}
        title={editingRole ? 'Editar Rol' : 'Crear Nuevo Rol'}
        maxWidth="620px"
      >
        <form onSubmit={handleSaveRole} noValidate>
          {modalError && (
            <div className="alert alert-error" role="alert" aria-live="polite">
              <AlertCircle size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
              <span>{modalError}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor={roleNameInputId}>
              Nombre del Rol
            </label>
            <input
              id={roleNameInputId}
              type="text"
              className="form-input"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="ej. Arquitecto de Software…"
              required
              disabled={modalSubmitting}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor={roleDescInputId}>
              Descripción
            </label>
            <textarea
              id={roleDescInputId}
              className="form-textarea"
              value={roleDescription}
              onChange={(e) => setRoleDescription(e.target.value)}
              placeholder="Describe las atribuciones y responsabilidades del rol…"
              rows={3}
              disabled={modalSubmitting}
            />
          </div>

          {/* Permissions Checklist */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <span className="form-label">Permisos de Sistema</span>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '8px',
                marginTop: '8px',
                maxHeight: '260px',
                overflowY: 'auto',
                padding: '10px',
                backgroundColor: 'var(--bg-input)',
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--secondary-border)',
              }}
            >
              {availablePermissions.map((perm) => {
                const isChecked = selectedPermissions.includes(perm.code);
                const checkboxId = `perm-chk-${perm.code}`;
                return (
                  <label
                    key={perm.code}
                    htmlFor={checkboxId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      backgroundColor: isChecked ? 'rgba(112, 90, 191, 0.18)' : 'transparent',
                      border: isChecked ? '1px solid var(--primary)' : '1px solid transparent',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'background-color var(--transition-fast)',
                    }}
                  >
                    <input
                      id={checkboxId}
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleTogglePermission(perm.code)}
                      disabled={modalSubmitting}
                      style={{
                        accentColor: 'var(--primary)',
                        width: '16px',
                        height: '16px',
                        cursor: 'pointer',
                      }}
                    />
                    <span style={{ fontSize: '0.85rem', color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {perm.name}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={modalSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={modalSubmitting}
            >
              {modalSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  <span>Guardando…</span>
                </>
              ) : (
                'Guardar Rol'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmar Eliminación */}
      <Modal
        isOpen={Boolean(roleToDelete)}
        onClose={() => {
          if (!deleteSubmitting) setRoleToDelete(null);
        }}
        title="Confirmar Eliminación de Rol"
      >
        <div>
          <p style={{ marginBottom: '24px', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
            ¿Estás seguro de que deseas eliminar el rol{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{roleToDelete?.name}</strong>?
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setRoleToDelete(null)}
              disabled={deleteSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-danger"
              onClick={handleDeleteRole}
              disabled={deleteSubmitting}
            >
              {deleteSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  <span>Eliminando…</span>
                </>
              ) : (
                'Eliminar Rol'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default Roles;
