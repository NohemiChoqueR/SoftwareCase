import React, { useState, useEffect } from 'react';
import type { GeneratedBackendCode } from '../../types';
import {
  X,
  Code2,
  Copy,
  Check,
  Download,
  Database,
  FileCode2,
  Loader2,
  AlertCircle,
  FileCheck2,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  diagramId: number;
  diagramName: string;
  generatedCode: GeneratedBackendCode | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

type TabType = 'spring_boot' | 'sql';

export const UMLCodeGeneratorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  diagramName,
  generatedCode,
  loading,
  error,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('spring_boot');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCopied(false);
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const getActiveCode = (): string => {
    if (!generatedCode) return '';
    switch (activeTab) {
      case 'spring_boot':
        return generatedCode.spring_boot || '// Sin clases para generar Spring Boot JPA Entities.';
      case 'sql':
        return generatedCode.sql || '-- Sin clases para generar SQL DDL.';
      default:
        return '';
    }
  };

  const getFileName = (): string => {
    switch (activeTab) {
      case 'spring_boot':
        return `${diagramName.toLowerCase().replace(/\s+/g, '_')}_springboot.java`;
      case 'sql':
        return 'schema.sql';
    }
  };

  const getLanguageLabel = (): string => {
    switch (activeTab) {
      case 'spring_boot':
        return 'JAVA 17+ / SPRING BOOT 3.x (JPA)';
      case 'sql':
        return 'POSTGRESQL 14+ / SQL DDL';
    }
  };

  const handleCopy = async () => {
    const code = getActiveCode();
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback para entornos donde clipboard no esté disponible
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleDownload = () => {
    const code = getActiveCode();
    if (!code) return;
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getFileName();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const activeCode = getActiveCode();
  const codeLines = activeCode.split('\n');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(10, 8, 18, 0.78)',
        backdropFilter: 'blur(8px)',
        padding: '24px 16px',
        animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '92vh',
          backgroundColor: 'var(--bg-container, #1E1A2D)',
          border: '1px solid var(--secondary-border, #2E2749)',
          borderRadius: 'var(--radius-modal, 16px)',
          boxShadow: '0 25px 65px -15px rgba(5, 3, 10, 0.85), 0 0 0 1px rgba(124, 92, 252, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--secondary-border, #2E2749)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(21, 18, 34, 0.6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #7C5CFC 0%, #6366F1 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(124, 92, 252, 0.4)',
                flexShrink: 0,
              }}
            >
              <Code2 size={22} />
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.2rem',
                  fontWeight: 600,
                  color: 'var(--text-primary, #FFFFFF)',
                  letterSpacing: '-0.01em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                Generador de Código Backend
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(74, 222, 128, 0.15)',
                    color: '#4ADE80',
                    border: '1px solid rgba(74, 222, 128, 0.3)',
                    textTransform: 'uppercase',
                  }}
                >
                  UML 2.5
                </span>
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary, #8E88A8)' }}>
                {diagramName} •{' '}
                {generatedCode ? (
                  <span>
                    <strong style={{ color: '#A78BFA' }}>{generatedCode.classes_count}</strong> clases y{' '}
                    <strong style={{ color: '#4ADE80' }}>{generatedCode.relationships_count}</strong> relaciones analizadas
                  </span>
                ) : (
                  'Modelos y esquemas listos para producción'
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              border: '1px solid transparent',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary, #8E88A8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary, #8E88A8)';
            }}
          >
            <X size={19} />
          </button>
        </div>

        {/* Tab Selector & Code Actions Bar */}
        <div
          style={{
            padding: '12px 24px',
            backgroundColor: 'var(--bg-elevated, #252037)',
            borderBottom: '1px solid var(--secondary-border, #2E2749)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('spring_boot')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: activeTab === 'spring_boot' ? 600 : 500,
                border: activeTab === 'spring_boot' ? '1px solid var(--primary, #7C5CFC)' : '1px solid transparent',
                backgroundColor: activeTab === 'spring_boot' ? 'rgba(124, 92, 252, 0.22)' : 'transparent',
                color: activeTab === 'spring_boot' ? '#FFFFFF' : 'var(--text-secondary, #8E88A8)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <FileCode2 size={16} style={{ color: activeTab === 'spring_boot' ? '#A78BFA' : 'inherit' }} />
              Spring Boot / JPA (Java)
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sql')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: activeTab === 'sql' ? 600 : 500,
                border: activeTab === 'sql' ? '1px solid var(--primary, #7C5CFC)' : '1px solid transparent',
                backgroundColor: activeTab === 'sql' ? 'rgba(124, 92, 252, 0.22)' : 'transparent',
                color: activeTab === 'sql' ? '#FFFFFF' : 'var(--text-secondary, #8E88A8)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Database size={16} style={{ color: activeTab === 'sql' ? '#4ADE80' : 'inherit' }} />
              PostgreSQL DDL (schema.sql)
            </button>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '0.74rem',
                color: 'var(--text-muted, #676182)',
                letterSpacing: '0.04em',
                fontWeight: 600,
                paddingRight: '6px',
              }}
            >
              {getLanguageLabel()}
            </span>

            <button
              type="button"
              onClick={handleCopy}
              disabled={loading || !activeCode}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 13px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 500,
                backgroundColor: copied ? 'rgba(74, 222, 128, 0.18)' : 'var(--bg-input, #151222)',
                border: copied ? '1px solid #4ADE80' : '1px solid var(--secondary-border, #2E2749)',
                color: copied ? '#4ADE80' : '#FFFFFF',
                cursor: loading || !activeCode ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Copiar código al portapapeles"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? '¡Copiado!' : 'Copiar'}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={loading || !activeCode}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                backgroundColor: 'var(--primary, #7C5CFC)',
                border: '1px solid var(--primary, #7C5CFC)',
                color: '#FFFFFF',
                cursor: loading || !activeCode ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(124, 92, 252, 0.3)',
                transition: 'all 0.15s ease',
              }}
              title={`Descargar ${getFileName()}`}
            >
              <Download size={14} />
              Descargar {getFileName()}
            </button>
          </div>
        </div>

        {/* Modal Body / Code Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            backgroundColor: '#120F1E',
            position: 'relative',
            minHeight: '340px',
            maxHeight: '560px',
          }}
        >
          {loading ? (
            <div
              style={{
                height: '320px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                color: 'var(--text-secondary, #8E88A8)',
              }}
            >
              <Loader2 size={36} className="animate-spin" style={{ color: 'var(--primary, #7C5CFC)' }} />
              <span style={{ fontSize: '0.9rem' }}>Analizando semántica UML y generando código…</span>
            </div>
          ) : error ? (
            <div
              style={{
                padding: '24px',
                borderRadius: '12px',
                backgroundColor: 'rgba(224, 82, 82, 0.1)',
                border: '1px solid #E05252',
                color: '#FF9B9B',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                margin: '20px 0',
              }}
            >
              <AlertCircle size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 600, color: '#FFFFFF' }}>
                  No se pudo generar el código
                </h4>
                <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem' }}>{error}</p>
                <button
                  type="button"
                  onClick={onRefresh}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  Reintentar
                </button>
              </div>
            </div>
          ) : generatedCode && generatedCode.classes_count === 0 ? (
            <div
              style={{
                height: '300px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                gap: '12px',
                color: 'var(--text-secondary, #8E88A8)',
              }}
            >
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(124, 92, 252, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary, #7C5CFC)',
                }}
              >
                <Code2 size={28} />
              </div>
              <h4 style={{ margin: 0, color: '#FFFFFF', fontSize: '1.05rem', fontWeight: 600 }}>
                El diagrama no contiene clases
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', maxWidth: '400px' }}>
                Crea clases, atributos y relaciones en el lienzo para que el motor de generación pueda estructurar tus
                modelos y esquemas SQL.
              </p>
            </div>
          ) : (
            <div
              style={{
                fontFamily: `'Fira Code', 'JetBrains Mono', 'Consolas', 'Courier New', monospace`,
                fontSize: '0.84rem',
                lineHeight: 1.65,
                color: '#E2E8F0',
                display: 'flex',
                userSelect: 'text',
              }}
            >
              {/* Line Numbers Gutter */}
              <div
                style={{
                  userSelect: 'none',
                  paddingRight: '16px',
                  marginRight: '16px',
                  borderRight: '1px solid rgba(46, 39, 73, 0.6)',
                  color: '#585272',
                  textAlign: 'right',
                  minWidth: '42px',
                }}
              >
                {codeLines.map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>

              {/* Code Pre Area */}
              <pre
                style={{
                  margin: 0,
                  flex: 1,
                  overflowX: 'auto',
                  whiteSpace: 'pre',
                  tabSize: 4,
                }}
              >
                <code>{activeCode}</code>
              </pre>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid var(--secondary-border, #2E2749)',
            backgroundColor: 'rgba(21, 18, 34, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.78rem',
            color: 'var(--text-secondary, #8E88A8)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCheck2 size={15} style={{ color: '#4ADE80' }} />
            <span>Código compatible con estándares de persistencia y APIs REST modernas.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
