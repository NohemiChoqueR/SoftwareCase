import React, { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { User } from '../types';
import {
  User as UserIcon,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();

  // Personal Info Form State
  const [personalData, setPersonalData] = useState({
    first_name: user?.first_name ?? '',
    last_name: user?.last_name ?? '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Form State
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setProfileSaving(true);
      setProfileSuccess(null);
      setProfileError(null);

      const res = await api.put<User>('/usuarios/perfil/', personalData);
      updateUser(res.data);
      setProfileSuccess('Datos personales actualizados correctamente.');
    } catch {
      setProfileError('Error al actualizar el perfil. Verifica la información.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError('Las nuevas contraseñas no coinciden.');
      return;
    }

    if (passwordData.new_password.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      setPasswordSaving(true);
      setPasswordSuccess(null);
      setPasswordError(null);

      await api.post('/usuarios/perfil/password/', {
        old_password: passwordData.old_password,
        new_password: passwordData.new_password,
        new_password_confirm: passwordData.confirm_password,
      });

      setPasswordSuccess('Contraseña cambiada con éxito.');
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
    } catch {
      setPasswordError('Error al cambiar contraseña. Verifica tu contraseña actual.');
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.8rem', marginBottom: '6px' }}>Mi Perfil</h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Gestiona tu información personal y credenciales de acceso en UMLForge
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '24px',
        }}
      >
        {/* Datos Personales */}
        <div className="card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '20px',
              paddingBottom: '14px',
              borderBottom: '1px solid var(--secondary-border-subtle)',
            }}
          >
            <UserIcon size={20} style={{ color: 'var(--primary-hover)' }} aria-hidden="true" />
            <h2 style={{ fontSize: '1.15rem', margin: 0 }}>Información Personal</h2>
          </div>

          {profileSuccess && (
            <div className="alert alert-success" role="alert" aria-live="polite">
              <CheckCircle2 size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="alert alert-error" role="alert" aria-live="polite">
              <AlertCircle size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleProfileSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="profile-email">
                Correo Electrónico
              </label>
              <input
                id="profile-email"
                type="email"
                className="form-input"
                value={user?.email ?? ''}
                disabled
                style={{ opacity: 0.7 }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                El correo electrónico identifica tu cuenta y no puede cambiarse directamente.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="profile-first-name">
                Nombre
              </label>
              <input
                id="profile-first-name"
                name="first_name"
                type="text"
                className="form-input"
                value={personalData.first_name}
                onChange={(e) => setPersonalData((p) => ({ ...p, first_name: e.target.value }))}
                placeholder="Tu nombre…"
                autoComplete="given-name"
                required
                disabled={profileSaving}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label" htmlFor="profile-last-name">
                Apellido
              </label>
              <input
                id="profile-last-name"
                name="last_name"
                type="text"
                className="form-input"
                value={personalData.last_name}
                onChange={(e) => setPersonalData((p) => ({ ...p, last_name: e.target.value }))}
                placeholder="Tu apellido…"
                autoComplete="family-name"
                required
                disabled={profileSaving}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={profileSaving}
              style={{ width: '100%' }}
            >
              {profileSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  <span>Guardando cambios…</span>
                </>
              ) : (
                'Actualizar Datos'
              )}
            </button>
          </form>
        </div>

        {/* Cambio de Contraseña */}
        <div className="card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '20px',
              paddingBottom: '14px',
              borderBottom: '1px solid var(--secondary-border-subtle)',
            }}
          >
            <KeyRound size={20} style={{ color: 'var(--primary-hover)' }} aria-hidden="true" />
            <h2 style={{ fontSize: '1.15rem', margin: 0 }}>Seguridad y Contraseña</h2>
          </div>

          {passwordSuccess && (
            <div className="alert alert-success" role="alert" aria-live="polite">
              <CheckCircle2 size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="alert alert-error" role="alert" aria-live="polite">
              <AlertCircle size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="old-password">
                Contraseña Actual
              </label>
              <input
                id="old-password"
                name="old_password"
                type="password"
                className="form-input"
                value={passwordData.old_password}
                onChange={(e) => setPasswordData((p) => ({ ...p, old_password: e.target.value }))}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                disabled={passwordSaving}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="new-password">
                Nueva Contraseña
              </label>
              <input
                id="new-password"
                name="new_password"
                type="password"
                className="form-input"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData((p) => ({ ...p, new_password: e.target.value }))}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                disabled={passwordSaving}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label" htmlFor="confirm-password">
                Confirmar Nueva Contraseña
              </label>
              <input
                id="confirm-password"
                name="confirm_password"
                type="password"
                className="form-input"
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData((p) => ({ ...p, confirm_password: e.target.value }))}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                disabled={passwordSaving}
              />
            </div>

            <button
              type="submit"
              className="btn btn-secondary"
              disabled={passwordSaving}
              style={{ width: '100%' }}
            >
              {passwordSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  <span>Actualizando contraseña…</span>
                </>
              ) : (
                'Modificar Contraseña'
              )}
            </button>
          </form>

          <div
            style={{
              marginTop: '24px',
              padding: '14px',
              borderRadius: 'var(--radius-control)',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--secondary-border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
            }}
          >
            <Shield size={16} aria-hidden="true" style={{ color: 'var(--primary-hover)', flexShrink: 0 }} />
            <span>Tus credenciales se cifran con hashes seguros mediante Argon2 / PBKDF2.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Profile;
