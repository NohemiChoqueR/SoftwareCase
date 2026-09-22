import React from 'react';
import type { UMLRelationship, UMLVisualNode } from '../../types';

interface Props {
  relationship: UMLRelationship;
  sourceNode?: UMLVisualNode;
  targetNode?: UMLVisualNode;
  isSelected: boolean;
  onSelect: (relId: string) => void;
}

interface Point {
  x: number;
  y: number;
}

/**
 * Calcula el punto de anclaje en el borde del rectángulo más cercano al centro del otro nodo.
 */
function getIntersectionPoint(rect: UMLVisualNode, targetCenter: Point): Point {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;

  const dx = targetCenter.x - cx;
  const dy = targetCenter.y - cy;

  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    return { x: cx, y: cy };
  }

  const halfW = rect.width / 2;
  const halfH = rect.height / 2;

  // Evaluar pendiente
  const slope = dy / dx;

  // Posible intersección en borde izquierdo o derecho
  const xLeftOrRight = dx > 0 ? halfW : -halfW;
  const yFromX = slope * xLeftOrRight;

  if (Math.abs(yFromX) <= halfH) {
    return { x: cx + xLeftOrRight, y: cy + yFromX };
  }

  // Intersección en borde superior o inferior
  const yTopOrBottom = dy > 0 ? halfH : -halfH;
  const xFromY = yTopOrBottom / slope;

  return { x: cx + xFromY, y: cy + yTopOrBottom };
}

export const UMLRelationshipEdge: React.FC<Props> = ({
  relationship,
  sourceNode,
  targetNode,
  isSelected,
  onSelect,
}) => {
  if (!sourceNode || !targetNode) return null;

  const sourceCenter: Point = {
    x: sourceNode.x + sourceNode.width / 2,
    y: sourceNode.y + sourceNode.height / 2,
  };

  const targetCenter: Point = {
    x: targetNode.x + targetNode.width / 2,
    y: targetNode.y + targetNode.height / 2,
  };

  const start = getIntersectionPoint(sourceNode, targetCenter);
  const end = getIntersectionPoint(targetNode, sourceCenter);

  const isDashed = relationship.type === 'realization' || relationship.type === 'dependency';

  // Marker ID para el tipo de relación
  let markerEnd = '';
  switch (relationship.type) {
    case 'inheritance':
      markerEnd = 'url(#marker-inheritance)';
      break;
    case 'realization':
      markerEnd = 'url(#marker-realization)';
      break;
    case 'aggregation':
      markerEnd = 'url(#marker-aggregation)';
      break;
    case 'composition':
      markerEnd = 'url(#marker-composition)';
      break;
    case 'dependency':
      markerEnd = 'url(#marker-dependency)';
      break;
    default:
      markerEnd = '';
  }

  // Punto medio para el nombre de la relación
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;

  // Puntos cercanos a extremos para multiplicidades
  const srcMultX = start.x + (end.x - start.x) * 0.18;
  const srcMultY = start.y + (end.y - start.y) * 0.18 - 8;

  const tgtMultX = end.x - (end.x - start.x) * 0.18;
  const tgtMultY = end.y - (end.y - start.y) * 0.18 - 8;

  const strokeColor = isSelected ? 'var(--primary)' : 'var(--primary)';

  return (
    <g
      onMouseDown={(e) => {
        e.stopPropagation();
        onSelect(relationship.id);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(relationship.id);
      }}
      style={{ cursor: 'pointer' }}
    >
      {/* Zona invisible más gruesa para facilitar click */}
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke="transparent"
        strokeWidth={20}
      />

      {/* Línea visible de la relación */}
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke={strokeColor}
        strokeWidth={isSelected ? 2.5 : 1.5}
        strokeDasharray={isDashed ? '6,4' : undefined}
        markerEnd={markerEnd}
        style={{
          transition: 'stroke 150ms ease, stroke-width 150ms ease',
          filter: isSelected ? 'drop-shadow(0 0 6px var(--primary-subtle))' : undefined,
        }}
      />

      {/* Nombre de la relación */}
      {relationship.name && (
        <text
          x={midX}
          y={midY - 8}
          textAnchor="middle"
          fill="var(--text-primary)"
          fontSize="10"
          fontWeight="500"
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
        >
          {relationship.name}
        </text>
      )}

      {/* Multiplicidad / Rol Origen */}
      {relationship.source_multiplicity && (
        <text
          x={srcMultX}
          y={srcMultY}
          textAnchor="middle"
          fill="var(--text-category)"
          fontSize="10"
          fontWeight="500"
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
        >
          {relationship.source_multiplicity}
        </text>
      )}

      {/* Multiplicidad / Rol Destino */}
      {relationship.target_multiplicity && (
        <text
          x={tgtMultX}
          y={tgtMultY}
          textAnchor="middle"
          fill="var(--text-category)"
          fontSize="10"
          fontWeight="500"
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
        >
          {relationship.target_multiplicity}
        </text>
      )}
    </g>
  );
};
