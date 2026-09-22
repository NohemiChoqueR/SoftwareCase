import React, { useRef } from 'react';
import type { UMLClass, UMLVisualNode, UMLVisibility } from '../../types';

interface Props {
  umlClass: UMLClass;
  visualNode: UMLVisualNode;
  isSelected: boolean;
  isConnecting: boolean;
  onSelect: (classId: string) => void;
  onMoveStart: (classId: string, startClientX: number, startClientY: number, initialX: number, initialY: number) => void;
  onStartConnection: (sourceId: string) => void;
  onCompleteConnection: (targetId: string) => void;
}

const VISIBILITY_SYMBOLS: Record<UMLVisibility, { symbol: string; color: string }> = {
  public: { symbol: '+', color: '#4ADE80' },
  private: { symbol: '-', color: '#ff9b9b' },
  protected: { symbol: '#', color: '#facc15' },
  package: { symbol: '~', color: '#93c5fd' },
};

export const UMLClassNode: React.FC<Props> = ({
  umlClass,
  visualNode,
  isSelected,
  isConnecting,
  onSelect,
  onMoveStart,
  onStartConnection,
  onCompleteConnection,
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(umlClass.id);
    onMoveStart(umlClass.id, e.clientX, e.clientY, visualNode.x, visualNode.y);
  };

  const handlePortClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isConnecting) {
      onCompleteConnection(umlClass.id);
    } else {
      onStartConnection(umlClass.id);
    }
  };

  const stereotypeText = umlClass.is_interface
    ? '«interface»'
    : umlClass.stereotype
    ? `«${umlClass.stereotype}»`
    : null;

  return (
    <div
      ref={nodeRef}
      id={`uml-node-${umlClass.id}`}
      style={{
        position: 'absolute',
        left: `${visualNode.x}px`,
        top: `${visualNode.y}px`,
        width: `${visualNode.width || 230}px`,
        minHeight: '130px',
        backgroundColor: 'var(--bg-container)',
        border: isSelected
          ? '1.5px solid #8C6EFE'
          : '1px solid var(--secondary-border)',
        borderRadius: 'var(--radius-card)',
        // Shadow puramente neutra (negra), sin halos ni resplandor neón coloreado
        boxShadow: isSelected
          ? '0 8px 24px rgba(0, 0, 0, 0.55)'
          : '0 4px 16px rgba(0, 0, 0, 0.35)',
        cursor: 'default',
        userSelect: 'none',
        zIndex: isSelected ? 20 : 10,
        fontFamily: 'var(--font-family)',
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onSelect(umlClass.id);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(umlClass.id);
      }}
    >
      {/* Compartment 1: Name and Stereotype */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          padding: '12px',
          borderBottom: '1px solid var(--secondary-border)',
          backgroundColor: 'var(--bg-elevated)',
          borderTopLeftRadius: 'calc(var(--radius-card) - 1px)',
          borderTopRightRadius: 'calc(var(--radius-card) - 1px)',
          cursor: 'grab',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {stereotypeText && (
          <div style={{ fontSize: '0.70rem', color: 'var(--text-secondary)', marginBottom: '2px', fontStyle: 'italic', fontWeight: 500 }}>
            {stereotypeText}
          </div>
        )}
        <div
          style={{
            fontWeight: 600,
            fontSize: '0.90rem',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {umlClass.name}
        </div>
      </div>

      {/* Compartment 2: Attributes */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--secondary-border)',
          fontSize: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          minHeight: '24px',
          fontFamily: 'var(--font-family)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {umlClass.attributes.length === 0 ? (
          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem' }}>
            — sin atributos —
          </span>
        ) : (
          umlClass.attributes.map((attr) => {
            const vis = VISIBILITY_SYMBOLS[attr.visibility] || VISIBILITY_SYMBOLS.public;
            return (
              <div
                key={attr.id}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '6px',
                }}
              >
                <span style={{ color: vis.color, width: '10px', fontWeight: 'bold' }}>
                  {vis.symbol}
                </span>
                <span style={{ color: 'var(--text-primary)' }}>
                  {attr.name}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>:</span>
                <span style={{ color: 'var(--accent-purple)' }}>{attr.type}</span>
                {attr.default_value && (
                  <span style={{ color: 'var(--text-muted)' }}> = {attr.default_value}</span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Compartment 3: Methods */}
      <div
        style={{
          padding: '8px 12px 14px 12px',
          fontSize: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          minHeight: '24px',
          fontFamily: 'var(--font-family)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {umlClass.methods.length === 0 ? (
          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem' }}>
            — sin métodos —
          </span>
        ) : (
          umlClass.methods.map((method) => {
            const vis = VISIBILITY_SYMBOLS[method.visibility] || VISIBILITY_SYMBOLS.public;
            const paramsStr = method.parameters
              .map((p) => `${p.name}: ${p.type}`)
              .join(', ');

            return (
              <div
                key={method.id}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '6px',
                }}
              >
                <span style={{ color: vis.color, width: '10px', fontWeight: 'bold' }}>
                  {vis.symbol}
                </span>
                <span style={{ color: 'var(--text-primary)' }}>
                  {method.name}
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>({paramsStr})</span>
                <span style={{ color: 'var(--text-muted)' }}>:</span>
                <span style={{ color: 'var(--accent-purple)' }}>{method.return_type || 'void'}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Connection Anchor Button */}
      <button
        type="button"
        onClick={handlePortClick}
        title={isConnecting ? 'Conectar aquí' : 'Crear relación desde esta clase'}
        style={{
          position: 'absolute',
          bottom: '-7px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          backgroundColor: isConnecting ? '#4ADE80' : '#7C5CFC',
          border: '2px solid var(--bg-container)',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'crosshair',
          zIndex: 30,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.4)',
          transition: 'transform 100ms ease, background-color 100ms ease',
          fontSize: '11px',
          lineHeight: '1',
          padding: 0,
        }}
      >
        +
      </button>
    </div>
  );
};

export default UMLClassNode;
