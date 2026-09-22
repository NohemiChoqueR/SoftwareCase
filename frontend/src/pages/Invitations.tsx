import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import type { Invitation } from '../types';
import { Mail, Check, X, Loader2, AlertCircle, Calendar } from 'lucide-react';

export const Invitations: React.FC = () => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<Invitation[]>('/invitaciones/me/');
      setInvitations(res.data);
    } catch {
      setError('Error al cargar las invitaciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchInvitations();
  }, [fetchInvitations]);

  const handleAccept = async (id: number) => {
    try {
      await api.post(`/invitaciones/${id}/accept/`);
      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
      // Option to show a toast or notification here
    } catch {
      alert('Error al aceptar la invitación.');
    }
  };

  const handleReject = async (id: number) => {
    try {
      await api.post(`/invitaciones/${id}/reject/`);
      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
    } catch {
      alert('Error al rechazar la invitación.');
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
        <p style={{ color: 'var(--text-secondary)' }}>Cargando tus invitaciones…</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.75rem', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Mail size={28} style={{ color: 'var(--primary)' }} />
          Bandeja de Invitaciones
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          Aquí aparecen las invitaciones a proyectos donde te han agregado como colaborador.
        </p>
      </div>

      {error && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: '24px' }}>
          <AlertCircle size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {invitations.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-input)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: 'var(--text-muted)'
            }}
          >
            <Mail size={32} />
          </div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Sin invitaciones pendientes</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
            Cuando el dueño de un proyecto te envíe una invitación, aparecerá en esta bandeja para que puedas aceptarla.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {invitations.map((inv) => (
            <div key={inv.id} className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
                  {inv.project_name}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Invitado por: <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{inv.created_by_email}</span>
                </p>
              </div>

              <div style={{ padding: '12px', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-control)', border: '1px solid var(--secondary-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Rol propuesto</span>
                  <span className="badge badge-primary">{inv.role_name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <Calendar size={14} />
                  <span>Enviada el {new Date(inv.created_at).toLocaleDateString('es-ES')}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '8px', color: 'var(--error)', borderColor: 'rgba(239,68,68,0.2)' }}
                  onClick={() => handleReject(inv.id)}
                >
                  <X size={16} />
                  Rechazar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '8px' }}
                  onClick={() => handleAccept(inv.id)}
                >
                  <Check size={16} />
                  Aceptar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Invitations;
