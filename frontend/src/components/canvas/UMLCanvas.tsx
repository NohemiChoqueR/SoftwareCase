import React, { useRef, useState, useCallback, useEffect } from 'react';
import type {
  UMLSemanticData,
  UMLVisualData,
  UMLViewport,
  UMLRelationshipType,
} from '../../types';
import { UMLClassNode } from './UMLClassNode';
import { UMLRelationshipEdge } from './UMLRelationshipEdge';
import type { CanvasTool } from './UMLToolbar';

interface Props {
  semanticData: UMLSemanticData;
  visualData: UMLVisualData;
  activeTool: CanvasTool;
  selectedRelType: UMLRelationshipType;
  selectedElementId: string | null;
  selectedElementType: 'node' | 'edge' | null;
  viewport: UMLViewport;
  onViewportChange: (viewport: UMLViewport) => void;
  onSelectElement: (id: string | null, type: 'node' | 'edge' | null) => void;
  onCreateClassAt: (canvasX: number, canvasY: number, isInterface: boolean) => void;
  onMoveNode: (nodeId: string, x: number, y: number) => void;
  onMoveNodeEnd: (nodeId: string, x: number, y: number) => void;
  onCreateRelationship: (sourceId: string, targetId: string, type: UMLRelationshipType) => void;
}

export const UMLCanvas: React.FC<Props> = ({
  semanticData,
  visualData,
  activeTool,
  selectedRelType,
  selectedElementId,
  selectedElementType,
  viewport,
  onViewportChange,
  onSelectElement,
  onCreateClassAt,
  onMoveNode,
  onMoveNodeEnd,
  onCreateRelationship,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan State
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ clientX: number; clientY: number; initialVpX: number; initialVpY: number }>({
    clientX: 0,
    clientY: 0,
    initialVpX: 0,
    initialVpY: 0,
  });

  // Drag Node State
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragNodeRef = useRef<{ startClientX: number; startClientY: number; initialX: number; initialY: number; lastX: number; lastY: number }>({
    startClientX: 0,
    startClientY: 0,
    initialX: 0,
    initialY: 0,
    lastX: 0,
    lastY: 0,
  });

  // Connecting State
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
  const [connectPointerPos, setConnectPointerPos] = useState<{ x: number; y: number } | null>(null);

  /**
   * Convierte coordenadas de cliente (pantalla) a coordenadas del lienzo (canvas)
   */
  const clientToCanvasCoords = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;

      return {
        x: (localX - viewport.x) / viewport.zoom,
        y: (localY - viewport.y) / viewport.zoom,
      };
    },
    [viewport]
  );

  // -------------------------------------------------------------
  // Mouse Down / Pan / Create node on click
  // -------------------------------------------------------------
  const handleContainerMouseDown = (e: React.MouseEvent) => {
    // Si el clic fue sobre una clase o un botón/control, no procesar como clic de lienzo
    const target = e.target as HTMLElement | SVGElement | null;
    if (target?.closest('[id^="uml-node-"]') || target?.closest('button')) {
      return;
    }

    // 1. Crear nueva clase o interfaz al hacer clic en el lienzo
    if (activeTool === 'new-class' || activeTool === 'new-interface') {
      const { x, y } = clientToCanvasCoords(e.clientX, e.clientY);
      onCreateClassAt(Math.round(x), Math.round(y), activeTool === 'new-interface');
      return;
    }

    // 2. Deseleccionar si hace clic en el fondo en modo mover/seleccionar
    onSelectElement(null, null);
    if (connectingSourceId) {
      setConnectingSourceId(null);
      setConnectPointerPos(null);
    }

    // 3. Iniciar paneo del lienzo al arrastrar el fondo
    setIsPanning(true);
    panStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initialVpX: viewport.x,
      initialVpY: viewport.y,
    };
  };

  // -------------------------------------------------------------
  // Node Drag Handlers
  // -------------------------------------------------------------
  const handleNodeMoveStart = (
    nodeId: string,
    startClientX: number,
    startClientY: number,
    initialX: number,
    initialY: number
  ) => {
    setDraggingNodeId(nodeId);
    dragNodeRef.current = {
      startClientX,
      startClientY,
      initialX,
      initialY,
      lastX: initialX,
      lastY: initialY,
    };
  };

  // -------------------------------------------------------------
  // Global Mouse Move & Mouse Up Handlers
  // -------------------------------------------------------------
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 1. Panning
      if (isPanning) {
        const dx = e.clientX - panStartRef.current.clientX;
        const dy = e.clientY - panStartRef.current.clientY;
        onViewportChange({
          ...viewport,
          x: panStartRef.current.initialVpX + dx,
          y: panStartRef.current.initialVpY + dy,
        });
        return;
      }

      // 2. Dragging Node
      if (draggingNodeId) {
        const deltaX = (e.clientX - dragNodeRef.current.startClientX) / viewport.zoom;
        const deltaY = (e.clientY - dragNodeRef.current.startClientY) / viewport.zoom;

        const newX = Math.round(dragNodeRef.current.initialX + deltaX);
        const newY = Math.round(dragNodeRef.current.initialY + deltaY);

        dragNodeRef.current.lastX = newX;
        dragNodeRef.current.lastY = newY;

        onMoveNode(draggingNodeId, newX, newY);
        return;
      }

      // 3. Connecting Line preview
      if (connectingSourceId) {
        const coords = clientToCanvasCoords(e.clientX, e.clientY);
        setConnectPointerPos(coords);
      }
    };

    const handleMouseUp = () => {
      if (isPanning) {
        setIsPanning(false);
      }
      if (draggingNodeId) {
        onMoveNodeEnd(draggingNodeId, dragNodeRef.current.lastX, dragNodeRef.current.lastY);
        setDraggingNodeId(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    isPanning,
    draggingNodeId,
    connectingSourceId,
    viewport,
    onViewportChange,
    onMoveNode,
    onMoveNodeEnd,
    clientToCanvasCoords,
  ]);

  // -------------------------------------------------------------
  // Wheel Zoom Handler
  // -------------------------------------------------------------
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const zoomFactor = 1.1;
    const isZoomIn = e.deltaY < 0;
    const newZoom = isZoomIn ? viewport.zoom * zoomFactor : viewport.zoom / zoomFactor;
    const clampedZoom = Math.max(0.25, Math.min(2.5, newZoom));

    // Centrar zoom en el puntero del ratón
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newX = mouseX - (mouseX - viewport.x) * (clampedZoom / viewport.zoom);
    const newY = mouseY - (mouseY - viewport.y) * (clampedZoom / viewport.zoom);

    onViewportChange({
      x: newX,
      y: newY,
      zoom: clampedZoom,
    });
  };

  // -------------------------------------------------------------
  // Connection Handlers
  // -------------------------------------------------------------
  const handleStartConnection = (sourceId: string) => {
    setConnectingSourceId(sourceId);
  };

  const handleCompleteConnection = (targetId: string) => {
    if (connectingSourceId && connectingSourceId !== targetId) {
      onCreateRelationship(connectingSourceId, targetId, selectedRelType);
    }
    setConnectingSourceId(null);
    setConnectPointerPos(null);
  };

  const sourceConnectingNode = connectingSourceId ? visualData.nodes[connectingSourceId] : null;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleContainerMouseDown}
      onWheel={handleWheel}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--bg-page)',
        overflow: 'hidden',
        cursor: isPanning
          ? 'grabbing'
          : activeTool === 'new-class' || activeTool === 'new-interface'
          ? 'crosshair'
          : 'default',
      }}
    >
      {/* Background SVG Grid & Connector Definitions */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <defs>
          {/* Subtle dot pattern */}
          <pattern
            id="uml-grid-pattern"
            width={30 * viewport.zoom}
            height={30 * viewport.zoom}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${viewport.x % (30 * viewport.zoom)}, ${viewport.y % (30 * viewport.zoom)})`}
          >
            <circle
              cx={2}
              cy={2}
              r={1.2}
              fill="rgba(255, 255, 255, 0.05)"
            />
          </pattern>

          {/* UML Marker: Inheritance (Hollow Triangle) */}
          <marker
            id="marker-inheritance"
            viewBox="0 0 16 16"
            refX="14"
            refY="8"
            markerWidth="14"
            markerHeight="14"
            orient="auto"
          >
            <polygon points="0 2, 14 8, 0 14" fill="#0F0D19" stroke="#7C5CFC" strokeWidth="1.5" />
          </marker>

          {/* UML Marker: Realization (Hollow Triangle for dashed line) */}
          <marker
            id="marker-realization"
            viewBox="0 0 16 16"
            refX="14"
            refY="8"
            markerWidth="14"
            markerHeight="14"
            orient="auto"
          >
            <polygon points="0 2, 14 8, 0 14" fill="#0F0D19" stroke="#7C5CFC" strokeWidth="1.5" />
          </marker>

          {/* UML Marker: Aggregation (Hollow Diamond) */}
          <marker
            id="marker-aggregation"
            viewBox="0 0 20 16"
            refX="18"
            refY="8"
            markerWidth="16"
            markerHeight="14"
            orient="auto"
          >
            <polygon points="0 8, 9 2, 18 8, 9 14" fill="#0F0D19" stroke="#7C5CFC" strokeWidth="1.5" />
          </marker>

          {/* UML Marker: Composition (Filled Diamond) */}
          <marker
            id="marker-composition"
            viewBox="0 0 20 16"
            refX="18"
            refY="8"
            markerWidth="16"
            markerHeight="14"
            orient="auto"
          >
            <polygon points="0 8, 9 2, 18 8, 9 14" fill="#7C5CFC" stroke="#7C5CFC" strokeWidth="1.5" />
          </marker>

          {/* UML Marker: Dependency (Open Arrow) */}
          <marker
            id="marker-dependency"
            viewBox="0 0 14 14"
            refX="12"
            refY="7"
            markerWidth="12"
            markerHeight="12"
            orient="auto"
          >
            <path d="M 2 2 L 12 7 L 2 12" fill="none" stroke="#7C5CFC" strokeWidth="1.5" />
          </marker>
        </defs>

        {/* Grid Background rect */}
        <rect width="100%" height="100%" fill="url(#uml-grid-pattern)" />
      </svg>

      {/* Transformable Canvas Space */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {/* Layer 1: SVG Relationships */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '10000px',
            height: '10000px',
            pointerEvents: 'none',
            overflow: 'visible',
          }}
        >
          <g style={{ pointerEvents: 'auto' }}>
            {semanticData.relationships.map((rel) => (
              <UMLRelationshipEdge
                key={rel.id}
                relationship={rel}
                sourceNode={visualData.nodes[rel.source_id]}
                targetNode={visualData.nodes[rel.target_id]}
                isSelected={selectedElementType === 'edge' && selectedElementId === rel.id}
                onSelect={(id) => onSelectElement(id, 'edge')}
              />
            ))}

            {/* Connecting line preview */}
            {sourceConnectingNode && connectPointerPos && (
              <line
                x1={sourceConnectingNode.x + sourceConnectingNode.width / 2}
                y1={sourceConnectingNode.y + sourceConnectingNode.height / 2}
                x2={connectPointerPos.x}
                y2={connectPointerPos.y}
                stroke="#4ADE80"
                strokeWidth={2}
                strokeDasharray="4,4"
              />
            )}
          </g>
        </svg>

        {/* Layer 2: HTML UML Class Nodes */}
        {semanticData.classes.map((cls) => {
          const vNode = visualData.nodes[cls.id] || { x: 100, y: 100, width: 230, height: 160 };
          return (
            <UMLClassNode
              key={cls.id}
              umlClass={cls}
              visualNode={vNode}
              isSelected={selectedElementType === 'node' && selectedElementId === cls.id}
              isConnecting={connectingSourceId !== null && connectingSourceId !== cls.id}
              onSelect={(id) => onSelectElement(id, 'node')}
              onMoveStart={handleNodeMoveStart}
              onStartConnection={handleStartConnection}
              onCompleteConnection={handleCompleteConnection}
            />
          );
        })}
      </div>
    </div>
  );
};
