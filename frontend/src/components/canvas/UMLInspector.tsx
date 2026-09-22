import React, { useState } from 'react';
import { X, Plus, Trash2, ArrowRight } from 'lucide-react';
import type {
  UMLClass,
  UMLRelationship,
  UMLRelationshipType,
  UMLVisibility,
  UMLAttribute,
  UMLMethod,
} from '../../types';

interface Props {
  selectedClass?: UMLClass;
  selectedRelationship?: UMLRelationship;
  allClasses: UMLClass[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateClass: (updatedClass: UMLClass) => void;
  onDeleteClass: (classId: string) => void;
  onUpdateRelationship: (updatedRel: UMLRelationship) => void;
  onDeleteRelationship: (relId: string) => void;
}

const VISIBILITY_LABELS: { value: UMLVisibility; short: string; label: string; symbol: string }[] = [
  { value: 'public', short: '+ Pu', label: '+ Pub', symbol: '+' },
  { value: 'private', short: '- Pr', label: '- Priv', symbol: '-' },
  { value: 'protected', short: '# Pr', label: '# Prot', symbol: '#' },
  { value: 'package', short: '~ Pk', label: '~ Pkg', symbol: '~' },
];

export const UMLInspector: React.FC<Props> = ({
  selectedClass,
  selectedRelationship,
  allClasses,
  isOpen,
  onClose,
  onUpdateClass,
  onDeleteClass,
  onUpdateRelationship,
  onDeleteRelationship,
}) => {
  // Local state for adding new attribute
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrType, setNewAttrType] = useState('string');
  const [newAttrVis, setNewAttrVis] = useState<UMLVisibility>('public');

  // Local state for adding new method
  const [newMethodName, setNewMethodName] = useState('');
  const [newMethodReturn, setNewMethodReturn] = useState('void');
  const [newMethodVis, setNewMethodVis] = useState<UMLVisibility>('public');
  const [newMethodParams, setNewMethodParams] = useState('');

  if (!isOpen) return null;

  // -------------------------------------------------------------
  // RENDER FOR UML CLASS
  // -------------------------------------------------------------
  if (selectedClass) {
    const handleNameChange = (name: string) => {
      onUpdateClass({ ...selectedClass, name });
    };

    const handleStereotypeChange = (stereotype: string) => {
      onUpdateClass({ ...selectedClass, stereotype: stereotype.trim() || undefined });
    };

    const handleToggleAbstract = () => {
      onUpdateClass({ ...selectedClass, is_abstract: !selectedClass.is_abstract });
    };

    const handleToggleInterface = () => {
      onUpdateClass({ ...selectedClass, is_interface: !selectedClass.is_interface });
    };

    // ATTRIBUTES
    const handleAddAttribute = (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!newAttrName.trim()) return;

      const newAttr: UMLAttribute = {
        id: `attr-${Date.now()}`,
        name: newAttrName.trim(),
        type: newAttrType.trim() || 'string',
        visibility: newAttrVis,
      };

      onUpdateClass({
        ...selectedClass,
        attributes: [...selectedClass.attributes, newAttr],
      });

      setNewAttrName('');
    };

    const handleDeleteAttribute = (id: string) => {
      onUpdateClass({
        ...selectedClass,
        attributes: selectedClass.attributes.filter((a) => a.id !== id),
      });
    };

    // METHODS
    const handleAddMethod = (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!newMethodName.trim()) return;

      const parsedParams = newMethodParams
        ? newMethodParams
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean)
            .map((part) => {
              const [name, type] = part.split(':').map((s) => s.trim());
              return { name: name || 'param', type: type || 'any' };
            })
        : [];

      const newMethod: UMLMethod = {
        id: `meth-${Date.now()}`,
        name: newMethodName.trim(),
        return_type: newMethodReturn.trim() || 'void',
        visibility: newMethodVis,
        parameters: parsedParams,
      };

      onUpdateClass({
        ...selectedClass,
        methods: [...selectedClass.methods, newMethod],
      });

      setNewMethodName('');
      setNewMethodParams('');
    };

    const handleDeleteMethod = (id: string) => {
      onUpdateClass({
        ...selectedClass,
        methods: selectedClass.methods.filter((m) => m.id !== id),
      });
    };

    return (
      <aside
        style={{
          position: 'absolute',
          top: '0',
          right: '0',
          bottom: '0',
          width: '380px',
          backgroundColor: 'var(--bg-sidebar)',
          borderLeft: '1px solid var(--secondary-border)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 45,
          boxShadow: '-8px 0 28px rgba(0, 0, 0, 0.5)',
          fontFamily: 'var(--font-family)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--secondary-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Propiedades de Clase
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar inspector"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Class Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.80rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Nombre de la Clase
            </label>
            <input
              type="text"
              value={selectedClass.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Cliente, Factura"
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--secondary-border)',
                borderRadius: 'var(--radius-control)',
                padding: '9px 12px',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Stereotype */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.80rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Estereotipo (Opcional)
            </label>
            <input
              type="text"
              value={selectedClass.stereotype || ''}
              onChange={(e) => handleStereotypeChange(e.target.value)}
              placeholder="e.g. entity, controller, service..."
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--secondary-border)',
                borderRadius: 'var(--radius-control)',
                padding: '9px 12px',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Abstract / Interface Checkboxes */}
          <div style={{ display: 'flex', gap: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectedClass.is_abstract}
                onChange={handleToggleAbstract}
                style={{ accentColor: 'var(--primary)', width: '15px', height: '15px' }}
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Abstracta</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectedClass.is_interface}
                onChange={handleToggleInterface}
                style={{ accentColor: 'var(--primary)', width: '15px', height: '15px' }}
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Interfaz</span>
            </label>
          </div>

          {/* ATRIBUTOS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--text-category)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              ATRIBUTOS ({selectedClass.attributes.length})
            </span>

            {/* Existing attributes list */}
            {selectedClass.attributes.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {selectedClass.attributes.map((attr) => (
                  <div
                    key={attr.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--secondary-border)',
                      borderRadius: 'var(--radius-control)',
                      fontSize: '0.84rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color:
                            attr.visibility === 'public'
                              ? '#4ADE80'
                              : attr.visibility === 'private'
                              ? '#ff9b9b'
                              : attr.visibility === 'protected'
                              ? '#facc15'
                              : '#93c5fd',
                          width: '12px',
                        }}
                      >
                        {attr.visibility === 'public'
                          ? '+'
                          : attr.visibility === 'private'
                          ? '-'
                          : attr.visibility === 'protected'
                          ? '#'
                          : '~'}
                      </span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{attr.name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>:</span>
                      <span style={{ color: 'var(--accent-purple)' }}>{attr.type}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteAttribute(attr.id)}
                      title="Eliminar atributo"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--error)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Attribute Inputs */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '10px',
                backgroundColor: 'rgba(21, 18, 34, 0.6)',
                border: '1px solid var(--secondary-border)',
                borderRadius: 'var(--radius-control)',
              }}
            >
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={newAttrVis}
                  onChange={(e) => setNewAttrVis(e.target.value as UMLVisibility)}
                  style={{
                    width: '84px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--secondary-border)',
                    borderRadius: 'var(--radius-control)',
                    color: 'var(--text-primary)',
                    padding: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                >
                  {VISIBILITY_LABELS.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="nombre"
                  value={newAttrName}
                  onChange={(e) => setNewAttrName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddAttribute();
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--secondary-border)',
                    borderRadius: 'var(--radius-control)',
                    color: 'var(--text-primary)',
                    padding: '8px 10px',
                    fontSize: '0.82rem',
                    outline: 'none',
                  }}
                />

                <input
                  type="text"
                  placeholder="string"
                  value={newAttrType}
                  onChange={(e) => setNewAttrType(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddAttribute();
                  }}
                  style={{
                    width: '74px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--secondary-border)',
                    borderRadius: 'var(--radius-control)',
                    color: 'var(--text-primary)',
                    padding: '8px 10px',
                    fontSize: '0.82rem',
                    outline: 'none',
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => handleAddAttribute()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '9px 12px',
                  backgroundColor: 'var(--bg-container)',
                  border: '1px solid var(--secondary-border)',
                  borderRadius: 'var(--radius-control)',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 100ms ease',
                }}
              >
                <Plus size={15} />
                <span>Añadir Atributo</span>
              </button>
            </div>
          </div>

          {/* MÉTODOS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--text-category)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              MÉTODOS ({selectedClass.methods.length})
            </span>

            {/* Existing methods list */}
            {selectedClass.methods.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {selectedClass.methods.map((meth) => {
                  const paramsText = meth.parameters.map((p) => `${p.name}: ${p.type}`).join(', ');
                  return (
                    <div
                      key={meth.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        backgroundColor: 'var(--bg-input)',
                        border: '1px solid var(--secondary-border)',
                        borderRadius: 'var(--radius-control)',
                        fontSize: '0.84rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color:
                              meth.visibility === 'public'
                                ? '#4ADE80'
                                : meth.visibility === 'private'
                                ? '#ff9b9b'
                                : meth.visibility === 'protected'
                                ? '#facc15'
                                : '#93c5fd',
                            width: '12px',
                          }}
                        >
                          {meth.visibility === 'public'
                            ? '+'
                            : meth.visibility === 'private'
                            ? '-'
                            : meth.visibility === 'protected'
                            ? '#'
                            : '~'}
                        </span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{meth.name}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>({paramsText})</span>
                        <span style={{ color: 'var(--text-muted)' }}>:</span>
                        <span style={{ color: 'var(--accent-purple)' }}>{meth.return_type || 'void'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteMethod(meth.id)}
                        title="Eliminar método"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--error)',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Method Inputs */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '10px',
                backgroundColor: 'rgba(21, 18, 34, 0.6)',
                border: '1px solid var(--secondary-border)',
                borderRadius: 'var(--radius-control)',
              }}
            >
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={newMethodVis}
                  onChange={(e) => setNewMethodVis(e.target.value as UMLVisibility)}
                  style={{
                    width: '84px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--secondary-border)',
                    borderRadius: 'var(--radius-control)',
                    color: 'var(--text-primary)',
                    padding: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                >
                  {VISIBILITY_LABELS.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="nombre"
                  value={newMethodName}
                  onChange={(e) => setNewMethodName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddMethod();
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--secondary-border)',
                    borderRadius: 'var(--radius-control)',
                    color: 'var(--text-primary)',
                    padding: '8px 10px',
                    fontSize: '0.82rem',
                    outline: 'none',
                  }}
                />

                <input
                  type="text"
                  placeholder="void"
                  value={newMethodReturn}
                  onChange={(e) => setNewMethodReturn(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddMethod();
                  }}
                  style={{
                    width: '74px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--secondary-border)',
                    borderRadius: 'var(--radius-control)',
                    color: 'var(--text-primary)',
                    padding: '8px 10px',
                    fontSize: '0.82rem',
                    outline: 'none',
                  }}
                />
              </div>

              <input
                type="text"
                placeholder="parámetros: id: int, clave: str..."
                value={newMethodParams}
                onChange={(e) => setNewMethodParams(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddMethod();
                }}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--secondary-border)',
                  borderRadius: 'var(--radius-control)',
                  color: 'var(--text-primary)',
                  padding: '8px 10px',
                  fontSize: '0.82rem',
                  outline: 'none',
                }}
              />

              <button
                type="button"
                onClick={() => handleAddMethod()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '9px 12px',
                  backgroundColor: 'var(--bg-container)',
                  border: '1px solid var(--secondary-border)',
                  borderRadius: 'var(--radius-control)',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 100ms ease',
                }}
              >
                <Plus size={15} />
                <span>Añadir Método</span>
              </button>
            </div>
          </div>

          {/* Delete Class Button */}
          <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
            <button
              type="button"
              onClick={() => onDeleteClass(selectedClass.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '11px',
                backgroundColor: 'rgba(224, 82, 82, 0.1)',
                border: '1px solid rgba(224, 82, 82, 0.25)',
                borderRadius: 'var(--radius-control)',
                color: '#ff9b9b',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(224, 82, 82, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(224, 82, 82, 0.1)';
              }}
            >
              <Trash2 size={16} />
              <span>Eliminar Clase del Diagrama</span>
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // -------------------------------------------------------------
  // RENDER FOR UML RELATIONSHIP
  // -------------------------------------------------------------
  if (selectedRelationship) {
    const srcClass = allClasses.find((c) => c.id === selectedRelationship.source_id);
    const tgtClass = allClasses.find((c) => c.id === selectedRelationship.target_id);

    return (
      <aside
        style={{
          position: 'absolute',
          top: '0',
          right: '0',
          bottom: '0',
          width: '380px',
          backgroundColor: 'var(--bg-sidebar)',
          borderLeft: '1px solid var(--secondary-border)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 45,
          boxShadow: '-8px 0 28px rgba(0, 0, 0, 0.5)',
          fontFamily: 'var(--font-family)',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--secondary-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Propiedades de Relación
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar inspector"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Origen -> Destino */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--secondary-border)',
              borderRadius: 'var(--radius-control)',
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{srcClass?.name || 'Origen'}</span>
            <ArrowRight size={16} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{tgtClass?.name || 'Destino'}</span>
          </div>

          {/* Tipo de Relación */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.80rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Tipo de Relación
            </label>
            <select
              value={selectedRelationship.type}
              onChange={(e) =>
                onUpdateRelationship({
                  ...selectedRelationship,
                  type: e.target.value as UMLRelationshipType,
                })
              }
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--secondary-border)',
                borderRadius: 'var(--radius-control)',
                padding: '9px 12px',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            >
              <option value="association">Asociación (──)</option>
              <option value="inheritance">Herencia (──▷)</option>
              <option value="realization">Realización (┈┈▷)</option>
              <option value="aggregation">Agregación (──◇)</option>
              <option value="composition">Composición (──◆)</option>
              <option value="dependency">Dependencia (┈┈&gt;)</option>
            </select>
          </div>

          {/* Nombre / Rol de la relación */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.80rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Nombre de Relación (Opcional)
            </label>
            <input
              type="text"
              placeholder="e.g. posee, gestiona, incluye"
              value={selectedRelationship.name || ''}
              onChange={(e) => onUpdateRelationship({ ...selectedRelationship, name: e.target.value })}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--secondary-border)',
                borderRadius: 'var(--radius-control)',
                padding: '9px 12px',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Multiplicidades */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.80rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Mult. Origen
              </label>
              <input
                type="text"
                placeholder="1, 0..1, *"
                value={selectedRelationship.source_multiplicity || ''}
                onChange={(e) =>
                  onUpdateRelationship({ ...selectedRelationship, source_multiplicity: e.target.value })
                }
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--secondary-border)',
                  borderRadius: 'var(--radius-control)',
                  padding: '9px 12px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.80rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Mult. Destino
              </label>
              <input
                type="text"
                placeholder="1, 0..*, *"
                value={selectedRelationship.target_multiplicity || ''}
                onChange={(e) =>
                  onUpdateRelationship({ ...selectedRelationship, target_multiplicity: e.target.value })
                }
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--secondary-border)',
                  borderRadius: 'var(--radius-control)',
                  padding: '9px 12px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Delete Relationship */}
          <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
            <button
              type="button"
              onClick={() => onDeleteRelationship(selectedRelationship.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '11px',
                backgroundColor: 'rgba(224, 82, 82, 0.1)',
                border: '1px solid rgba(224, 82, 82, 0.25)',
                borderRadius: 'var(--radius-control)',
                color: '#ff9b9b',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(224, 82, 82, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(224, 82, 82, 0.1)';
              }}
            >
              <Trash2 size={16} />
              <span>Eliminar Relación del Diagrama</span>
            </button>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      style={{
        position: 'absolute',
        top: '0',
        right: '0',
        bottom: '0',
        width: '380px',
        backgroundColor: 'var(--bg-sidebar)',
        borderLeft: '1px solid var(--secondary-border)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 45,
        boxShadow: '-8px 0 28px rgba(0, 0, 0, 0.5)',
        fontFamily: 'var(--font-family)',
      }}
    >
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--secondary-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Inspector
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar inspector"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <X size={18} />
        </button>
      </div>
      <div
        style={{
          flex: 1,
          padding: '40px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: '12px',
          color: 'var(--text-secondary)',
        }}
      >
        <p style={{ fontSize: '0.90rem', lineHeight: '1.5' }}>
          Selecciona una clase o relación en el lienzo para inspeccionar y editar sus propiedades.
        </p>
      </div>
    </aside>
  );
};

export default UMLInspector;
