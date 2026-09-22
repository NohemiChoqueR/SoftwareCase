import React, { useState, useRef, useEffect } from 'react';
import {
  MousePointer2,
  Box,
  Layers,
  ArrowRight,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import type { UMLRelationshipType } from '../../types';

export type CanvasTool = 'select' | 'new-class' | 'new-interface' | 'connect';

interface Props {
  activeTool: CanvasTool;
  selectedRelType: UMLRelationshipType;
  zoom: number;
  isSaving: boolean;
  version: number;
  onSelectTool: (tool: CanvasTool) => void;
  onChangeRelType: (type: UMLRelationshipType) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  isInspectorOpen?: boolean;
}

const RELATIONSHIP_OPTIONS: { type: UMLRelationshipType; label: string; symbol: string }[] = [
  { type: 'association', label: 'Asociación', symbol: '──' },
  { type: 'inheritance', label: 'Herencia', symbol: '──▷' },
  { type: 'realization', label: 'Realización', symbol: '┈┈▷' },
  { type: 'aggregation', label: 'Agregación', symbol: '──◇' },
  { type: 'composition', label: 'Composición', symbol: '──◆' },
  { type: 'dependency', label: 'Dependencia', symbol: '┈┈>' },
];

export const UMLToolbar: React.FC<Props> = ({
  activeTool,
  selectedRelType,
  zoom,
  isSaving,
  version,
  onSelectTool,
  onChangeRelType,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  isInspectorOpen = false,
}) => {
  const [isRelMenuOpen, setIsRelMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsRelMenuOpen(false);
      }
    };
    if (isRelMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isRelMenuOpen]);

  const currentRel =
    RELATIONSHIP_OPTIONS.find((r) => r.type === selectedRelType) || {
      type: 'association' as UMLRelationshipType,
      label: 'Asociación',
      symbol: '──',
    };

  return (
    <div
      style={{
        position: 'absolute',
        top: '20px',
        left: isInspectorOpen ? 'calc((100% - 380px) / 2)' : '50%',
        transform: 'translateX(-50%)',
        transition: 'left 200ms ease',
        zIndex: 35,
        backgroundColor: 'rgba(20, 18, 31, 0.94)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--secondary-border)',
        borderRadius: '9999px',
        padding: '6px 14px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '6px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        userSelect: 'none',
      }}
    >
      {/* Tool: Mover */}
      <button
        type="button"
        onClick={() => {
          onSelectTool('select');
          setIsRelMenuOpen(false);
        }}
        title="Mover y seleccionar elementos"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          padding: '8px 14px',
          borderRadius: '9999px',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.85rem',
          fontWeight: 500,
          backgroundColor: activeTool === 'select' ? 'var(--primary)' : 'transparent',
          color: activeTool === 'select' ? '#FFFFFF' : 'var(--text-secondary)',
          transition: 'all 120ms ease',
        }}
      >
        <MousePointer2 size={16} aria-hidden="true" />
        <span>Mover</span>
      </button>

      {/* Tool: + Clase */}
      <button
        type="button"
        onClick={() => {
          onSelectTool('new-class');
          setIsRelMenuOpen(false);
        }}
        title="Crear nueva clase UML en el lienzo"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          padding: '8px 14px',
          borderRadius: '9999px',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.85rem',
          fontWeight: 500,
          backgroundColor: activeTool === 'new-class' ? 'var(--primary)' : 'transparent',
          color: activeTool === 'new-class' ? '#FFFFFF' : 'var(--text-secondary)',
          transition: 'all 120ms ease',
        }}
      >
        <Box size={16} aria-hidden="true" />
        <span>+ Clase</span>
      </button>

      {/* Tool: + Interfaz */}
      <button
        type="button"
        onClick={() => {
          onSelectTool('new-interface');
          setIsRelMenuOpen(false);
        }}
        title="Crear nueva interfaz UML en el lienzo"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          padding: '8px 14px',
          borderRadius: '9999px',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.85rem',
          fontWeight: 500,
          backgroundColor: activeTool === 'new-interface' ? 'var(--primary)' : 'transparent',
          color: activeTool === 'new-interface' ? '#FFFFFF' : 'var(--text-secondary)',
          transition: 'all 120ms ease',
        }}
      >
        <Layers size={16} aria-hidden="true" />
        <span>+ Interfaz</span>
      </button>

      {/* Tool: Relación */}
      <button
        type="button"
        onClick={() => {
          onSelectTool('connect');
        }}
        title="Activar modo conectar relaciones entre clases"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          padding: '8px 14px',
          borderRadius: '9999px',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.85rem',
          fontWeight: 500,
          backgroundColor: activeTool === 'connect' ? 'var(--primary)' : 'transparent',
          color: activeTool === 'connect' ? '#FFFFFF' : 'var(--text-secondary)',
          transition: 'all 120ms ease',
        }}
      >
        <ArrowRight size={16} aria-hidden="true" />
        <span>Relación</span>
      </button>

      {/* Relationship Selector Dropdown */}
      <div style={{ position: 'relative' }} ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsRelMenuOpen((prev) => !prev)}
          title="Seleccionar tipo de relación UML"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 12px',
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--secondary-border)',
            borderRadius: 'var(--radius-control)',
            color: 'var(--text-primary)',
            fontSize: '0.82rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <span>
            {currentRel.label} ({currentRel.symbol})
          </span>
          <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} aria-hidden="true" />
        </button>

        {isRelMenuOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: '0',
              backgroundColor: 'var(--bg-sidebar)',
              border: '1px solid var(--secondary-border)',
              borderRadius: '8px',
              padding: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
              minWidth: '190px',
              zIndex: 60,
            }}
          >
            {RELATIONSHIP_OPTIONS.map((item) => {
              const isSelected = selectedRelType === item.type;
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => {
                    onChangeRelType(item.type);
                    setIsRelMenuOpen(false);
                    onSelectTool('connect');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: isSelected ? '#2563EB' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: '#FFFFFF',
                    fontSize: '0.82rem',
                    textAlign: 'left',
                    fontWeight: isSelected ? 600 : 400,
                    transition: 'background-color 100ms ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <span>{item.label}</span>
                  <span style={{ fontFamily: 'monospace', color: isSelected ? '#FFFFFF' : 'var(--text-muted)' }}>
                    ({item.symbol})
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--secondary-border)', margin: '0 4px' }} />

      {/* Zoom Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          type="button"
          onClick={onZoomOut}
          title="Alejar Zoom (-)"
          style={{
            padding: '6px',
            borderRadius: 'var(--radius-control)',
            color: 'var(--text-muted)',
            border: 'none',
            cursor: 'pointer',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ZoomOut size={16} aria-hidden="true" />
        </button>

        <span
          className="tabular-nums"
          style={{
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            fontWeight: 600,
            minWidth: '40px',
            textAlign: 'center',
          }}
        >
          {Math.round(zoom * 100)}%
        </span>

        <button
          type="button"
          onClick={onZoomIn}
          title="Acercar Zoom (+)"
          style={{
            padding: '6px',
            borderRadius: 'var(--radius-control)',
            color: 'var(--text-muted)',
            border: 'none',
            cursor: 'pointer',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ZoomIn size={16} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onResetZoom}
          title="Centrar y reajustar lienzo (100%)"
          style={{
            padding: '6px',
            borderRadius: 'var(--radius-control)',
            color: 'var(--text-muted)',
            border: 'none',
            cursor: 'pointer',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <RotateCcw size={15} aria-hidden="true" />
        </button>
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--secondary-border)', margin: '0 4px' }} />

      {/* Sync Status Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '4px' }}>
        {isSaving ? (
          <Loader2 size={16} className="animate-spin" style={{ color: 'var(--primary)' }} aria-hidden="true" />
        ) : (
          <span
            title={`Diagrama sincronizado (v${version})`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              fontWeight: 500,
            }}
          >
            <CheckCircle2 size={16} style={{ color: '#4ADE80' }} aria-hidden="true" />
            <span className="tabular-nums">v{version}</span>
          </span>
        )}
      </div>
    </div>
  );
};

export default UMLToolbar;
