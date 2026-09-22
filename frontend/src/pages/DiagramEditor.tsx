import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  DiagramSocketService,
  type DiagramMutationEvent,
  type PresenceUser,
} from '../services/diagramSocket';
import type {
  Diagram,
  UMLSemanticData,
  UMLVisualData,
  UMLViewport,
  UMLRelationshipType,
  UMLClass,
  UMLRelationship,
} from '../types';
import { UMLCanvas } from '../components/canvas/UMLCanvas';
import { UMLToolbar, type CanvasTool } from '../components/canvas/UMLToolbar';
import { UMLInspector } from '../components/canvas/UMLInspector';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Download,
  SlidersHorizontal,
  Wifi,
  WifiOff,
} from 'lucide-react';

export const DiagramEditor: React.FC = () => {
  const { projectId, diagramId } = useParams<{ projectId: string; diagramId: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [diagram, setDiagram] = useState<Diagram | null>(null);
  const [semanticData, setSemanticData] = useState<UMLSemanticData>({ classes: [], relationships: [] });
  const [visualData, setVisualData] = useState<Omit<UMLVisualData, 'viewport'>>({
    nodes: {},
    connections: {},
  });

  // -------------------------------------------------------------
  // Cámara / Viewport INDEPENDIENTE por sesión de usuario (Desacoplada)
  // -------------------------------------------------------------
  const [viewport, setViewport] = useState<UMLViewport>(() => {
    try {
      if (diagramId) {
        const saved = sessionStorage.getItem(`uml_vp_${diagramId}`);
        if (saved) return JSON.parse(saved);
      }
    } catch {
      // Ignorar error de parsing
    }
    return { x: 80, y: 80, zoom: 1.0 };
  });

  const handleViewportChange = useCallback(
    (newVp: UMLViewport) => {
      setViewport(newVp);
      try {
        if (diagramId) {
          sessionStorage.setItem(`uml_vp_${diagramId}`, JSON.stringify(newVp));
        }
      } catch {
        // Ignorar error de storage
      }
    },
    [diagramId]
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // WebSocket y Colaboración en Tiempo Real
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [activeCollaborators, setActiveCollaborators] = useState<PresenceUser[]>([]);

  // Active Tool & Selection State
  const [activeTool, setActiveTool] = useState<CanvasTool>('select');
  const [selectedRelType, setSelectedRelType] = useState<UMLRelationshipType>('association');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedElementType, setSelectedElementType] = useState<'node' | 'edge' | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // -------------------------------------------------------------
  // Load Diagram from API (Inicial)
  // -------------------------------------------------------------
  const loadDiagram = useCallback(async () => {
    if (!diagramId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<Diagram>(`/diagramas/${diagramId}/`);
      const data = res.data;
      setDiagram(data);

      if (data.semantic_data) {
        setSemanticData({
          classes: data.semantic_data.classes || [],
          relationships: data.semantic_data.relationships || [],
        });
      }

      if (data.visual_data) {
        setVisualData({
          nodes: data.visual_data.nodes || {},
          connections: data.visual_data.connections || {},
        });

        // Solo si nunca se ha guardado un viewport local en sessionStorage, usar el sugerido por el diagrama
        if (!sessionStorage.getItem(`uml_vp_${diagramId}`) && data.visual_data.viewport) {
          setViewport(data.visual_data.viewport);
        }
      }
    } catch {
      setError('No se pudo cargar el diagrama UML.');
    } finally {
      setLoading(false);
    }
  }, [diagramId]);

  useEffect(() => {
    void loadDiagram();
  }, [loadDiagram]);

  // -------------------------------------------------------------
  // Conexión WebSocket para Sincronización en Tiempo Real
  // -------------------------------------------------------------
  useEffect(() => {
    if (!diagramId || !token) return;

    const socketService = new DiagramSocketService(diagramId, token);

    socketService.onStatusChange = (connected) => {
      setIsWsConnected(connected);
    };

    socketService.onPresence = (evt) => {
      if (evt.event === 'user_joined') {
        setActiveCollaborators((prev) => {
          if (prev.some((u) => u.id === evt.user.id)) return prev;
          return [...prev, evt.user];
        });
      } else if (evt.event === 'user_left') {
        setActiveCollaborators((prev) => prev.filter((u) => u.id !== evt.user.id));
      }
    };

    socketService.onMutation = (evt: DiagramMutationEvent) => {
      // Si fui yo quien emitió la mutación, ya se aplicó optimísticamente
      if (user && evt.sender_id === user.id) return;

      // Actualizar número de versión del diagrama
      if (evt.version) {
        setDiagram((prev) => (prev ? { ...prev, version: evt.version } : null));
      }

      const { action, payload } = evt;
      if (!payload) return;

      if (action === 'ADD_NODE') {
        const newClass: UMLClass = {
          id: payload.id,
          name: payload.name,
          is_abstract: payload.is_abstract || false,
          is_interface: payload.is_interface || false,
          stereotype: payload.stereotype,
          attributes: payload.attributes || [],
          methods: payload.methods || [],
        };
        const newVisualNode = {
          x: payload.position?.x ?? payload.x ?? 100,
          y: payload.position?.y ?? payload.y ?? 100,
          width: payload.size?.width ?? payload.width ?? 230,
          height: payload.size?.height ?? payload.height ?? 150,
          color: null,
        };

        setSemanticData((prev) => ({
          ...prev,
          classes: [...prev.classes.filter((c) => c.id !== newClass.id), newClass],
        }));
        setVisualData((prev) => ({
          ...prev,
          nodes: { ...prev.nodes, [newClass.id]: newVisualNode },
        }));
      } else if (action === 'MOVE_NODE') {
        const { id, x, y } = payload;
        setVisualData((prev) => ({
          ...prev,
          nodes: {
            ...prev.nodes,
            [id]: {
              ...(prev.nodes[id] || { width: 230, height: 150 }),
              x,
              y,
            },
          },
        }));
      } else if (action === 'UPDATE_NODE') {
        setSemanticData((prev) => ({
          ...prev,
          classes: prev.classes.map((c) => (c.id === payload.id ? { ...c, ...payload } : c)),
        }));
      } else if (action === 'DELETE_NODE') {
        const targetId = payload.id;
        setSemanticData((prev) => ({
          classes: prev.classes.filter((c) => c.id !== targetId),
          relationships: prev.relationships.filter(
            (r) => r.source_id !== targetId && r.target_id !== targetId
          ),
        }));
        setVisualData((prev) => {
          const nextNodes = { ...prev.nodes };
          delete nextNodes[targetId];
          return { ...prev, nodes: nextNodes };
        });
        setSelectedElementId((current) => (current === targetId ? null : current));
      } else if (action === 'ADD_RELATIONSHIP') {
        const newRel: UMLRelationship = payload;
        setSemanticData((prev) => ({
          ...prev,
          relationships: [...prev.relationships.filter((r) => r.id !== newRel.id), newRel],
        }));
      } else if (action === 'UPDATE_RELATIONSHIP') {
        setSemanticData((prev) => ({
          ...prev,
          relationships: prev.relationships.map((r) =>
            r.id === payload.id ? { ...r, ...payload } : r
          ),
        }));
      } else if (action === 'DELETE_RELATIONSHIP') {
        const targetId = payload.id;
        setSemanticData((prev) => ({
          ...prev,
          relationships: prev.relationships.filter((r) => r.id !== targetId),
        }));
        setSelectedElementId((current) => (current === targetId ? null : current));
      } else if (action === 'BATCH_MUTATE') {
        void loadDiagram();
      }
    };

    socketService.connect();

    return () => {
      socketService.disconnect();
    };
  }, [diagramId, token, user, loadDiagram]);

  // -------------------------------------------------------------
  // Helper for applying backend mutations
  // -------------------------------------------------------------
  const sendMutation = async (action: string, payload: Record<string, unknown>) => {
    if (!diagramId) return null;
    try {
      setIsSaving(true);
      const res = await api.post<{ version: number; diagram: Diagram }>(
        `/diagramas/${diagramId}/mutations/`,
        { action, payload }
      );
      if (res.data && res.data.version) {
        setDiagram((prev) => (prev ? { ...prev, version: res.data.version } : null));
      }
      return res.data;
    } catch (err) {
      console.error('Error applying UML mutation:', err);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // -------------------------------------------------------------
  // Selection
  // -------------------------------------------------------------
  const handleSelectElement = (id: string | null, type: 'node' | 'edge' | null) => {
    setSelectedElementId(id);
    setSelectedElementType(type);
    if (id && type) {
      setIsInspectorOpen(true);
    }
  };

  // -------------------------------------------------------------
  // Viewport Zoom Controls (Locales de Cámara)
  // -------------------------------------------------------------
  const handleZoomIn = () => {
    handleViewportChange({
      ...viewport,
      zoom: Math.min(2.5, +(viewport.zoom + 0.15).toFixed(2)),
    });
  };

  const handleZoomOut = () => {
    handleViewportChange({
      ...viewport,
      zoom: Math.max(0.25, +(viewport.zoom - 0.15).toFixed(2)),
    });
  };

  const handleResetZoom = () => {
    handleViewportChange({ x: 80, y: 80, zoom: 1.0 });
  };

  // -------------------------------------------------------------
  // Mutations: Classes
  // -------------------------------------------------------------
  const handleCreateClassAt = async (canvasX: number, canvasY: number, isInterface: boolean) => {
    const newId = `c-${Math.random().toString(36).substring(2, 9)}`;
    const baseName = isInterface ? 'NuevaInterfaz' : 'NuevaClase';
    const existingCount = semanticData.classes.filter((c) => c.name.startsWith(baseName)).length;
    const name = existingCount > 0 ? `${baseName}${existingCount + 1}` : baseName;

    const newClass: UMLClass = {
      id: newId,
      name,
      is_abstract: false,
      is_interface: isInterface,
      attributes: [],
      methods: [],
    };

    const newVisualNode = {
      x: canvasX,
      y: canvasY,
      width: 230,
      height: 150,
      color: null,
    };

    // Optimistic Update
    setSemanticData((prev) => ({ ...prev, classes: [...prev.classes, newClass] }));
    setVisualData((prev) => ({
      ...prev,
      nodes: { ...prev.nodes, [newId]: newVisualNode },
    }));
    handleSelectElement(newId, 'node');
    setActiveTool('select');

    // Backend mutation (broadcast automático por Django Channels)
    await sendMutation('ADD_NODE', {
      id: newId,
      name,
      is_abstract: false,
      is_interface: isInterface,
      position: { x: canvasX, y: canvasY },
      size: { width: 230, height: 150 },
    });
  };

  const handleMoveNode = (nodeId: string, x: number, y: number) => {
    setVisualData((prev) => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [nodeId]: {
          ...(prev.nodes[nodeId] || { width: 230, height: 160 }),
          x,
          y,
        },
      },
    }));
  };

  const handleMoveNodeEnd = async (nodeId: string, x: number, y: number) => {
    await sendMutation('MOVE_NODE', { id: nodeId, x, y });
  };

  const handleUpdateClass = async (updatedClass: UMLClass) => {
    setSemanticData((prev) => ({
      ...prev,
      classes: prev.classes.map((c) => (c.id === updatedClass.id ? updatedClass : c)),
    }));
    await sendMutation('UPDATE_NODE', {
      id: updatedClass.id,
      name: updatedClass.name,
      is_abstract: updatedClass.is_abstract,
      is_interface: updatedClass.is_interface,
      stereotype: updatedClass.stereotype,
      attributes: updatedClass.attributes,
      methods: updatedClass.methods,
    });
  };

  const handleDeleteClass = async (classId: string) => {
    setSemanticData((prev) => ({
      classes: prev.classes.filter((c) => c.id !== classId),
      relationships: prev.relationships.filter(
        (r) => r.source_id !== classId && r.target_id !== classId
      ),
    }));

    setVisualData((prev) => {
      const newNodes = { ...prev.nodes };
      delete newNodes[classId];
      return { ...prev, nodes: newNodes };
    });

    setSelectedElementId(null);
    setSelectedElementType(null);
    setIsInspectorOpen(false);

    await sendMutation('DELETE_NODE', { id: classId });
  };

  // -------------------------------------------------------------
  // Mutations: Relationships
  // -------------------------------------------------------------
  const handleCreateRelationship = async (
    sourceId: string,
    targetId: string,
    type: UMLRelationshipType
  ) => {
    const relId = `rel-${Math.random().toString(36).substring(2, 9)}`;

    const newRel: UMLRelationship = {
      id: relId,
      type,
      source_id: sourceId,
      target_id: targetId,
      name: '',
      source_multiplicity: type === 'association' ? '1' : '',
      target_multiplicity: type === 'association' ? '0..*' : '',
    };

    setSemanticData((prev) => ({
      ...prev,
      relationships: [...prev.relationships, newRel],
    }));

    handleSelectElement(relId, 'edge');

    await sendMutation('ADD_RELATIONSHIP', {
      id: relId,
      type,
      source_id: sourceId,
      target_id: targetId,
      source_multiplicity: newRel.source_multiplicity,
      target_multiplicity: newRel.target_multiplicity,
    });
  };

  const handleUpdateRelationship = async (updatedRel: UMLRelationship) => {
    setSemanticData((prev) => ({
      ...prev,
      relationships: prev.relationships.map((r) => (r.id === updatedRel.id ? updatedRel : r)),
    }));

    await sendMutation('UPDATE_RELATIONSHIP', {
      id: updatedRel.id,
      type: updatedRel.type,
      name: updatedRel.name,
      source_role: updatedRel.source_role,
      target_role: updatedRel.target_role,
      source_multiplicity: updatedRel.source_multiplicity,
      target_multiplicity: updatedRel.target_multiplicity,
    });
  };

  const handleDeleteRelationship = async (relId: string) => {
    setSemanticData((prev) => ({
      ...prev,
      relationships: prev.relationships.filter((r) => r.id !== relId),
    }));

    setSelectedElementId(null);
    setSelectedElementType(null);
    setIsInspectorOpen(false);

    await sendMutation('DELETE_RELATIONSHIP', { id: relId });
  };

  // -------------------------------------------------------------
  // Export JSON
  // -------------------------------------------------------------
  const handleExportJSON = () => {
    if (!diagram) return;
    const exportPayload = {
      diagram_name: diagram.name,
      version: diagram.version,
      semantic_data: semanticData,
      visual_data: {
        ...visualData,
        viewport,
      },
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${diagram.name.toLowerCase().replace(/\s+/g, '_')}_uml.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const canvasVisualData = useMemo<UMLVisualData>(
    () => ({
      ...visualData,
      viewport,
    }),
    [visualData, viewport]
  );

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          width: '100vw',
          backgroundColor: 'var(--bg-page)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '14px',
          color: 'var(--text-secondary)',
        }}
      >
        <Loader2 size={40} className="animate-spin" style={{ color: 'var(--primary)' }} aria-hidden="true" />
        <p style={{ fontSize: '0.92rem' }}>Cargando Lienzo de Modelado UML…</p>
      </div>
    );
  }

  if (error || !diagram) {
    return (
      <div
        style={{
          minHeight: '100vh',
          width: '100vw',
          backgroundColor: 'var(--bg-page)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div className="card" style={{ maxWidth: '520px', textAlign: 'center', padding: '40px' }}>
          <AlertCircle size={42} style={{ color: 'var(--error)', marginBottom: '14px' }} aria-hidden="true" />
          <h2 style={{ marginBottom: '8px' }}>Error al abrir el diagrama</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{error || 'Diagrama no encontrado.'}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate(projectId ? `/proyectos/${projectId}` : '/proyectos')}
          >
            Volver al Proyecto
          </button>
        </div>
      </div>
    );
  }

  const selectedClass =
    selectedElementType === 'node'
      ? semanticData.classes.find((c) => c.id === selectedElementId)
      : undefined;

  const selectedRelationship =
    selectedElementType === 'edge'
      ? semanticData.relationships.find((r) => r.id === selectedElementId)
      : undefined;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        backgroundColor: 'var(--bg-page)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Diagram Header Bar */}
      <div
        style={{
          height: '56px',
          padding: '0 24px',
          backgroundColor: 'var(--bg-sidebar)',
          borderBottom: '1px solid var(--secondary-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 30,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link
            to={`/proyectos/${projectId || diagram.project}`}
            className="btn btn-ghost"
            style={{ padding: '6px 10px', fontSize: '0.82rem' }}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Volver</span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>{diagram.name}</h1>
            <span className="badge badge-primary tabular-nums">
              v{diagram.version}
            </span>
          </div>
        </div>

        {/* Center: Live Collaboration Status & Active Users */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* WebSocket Status Indicator */}
          <div
            title={isWsConnected ? 'Conexión en vivo activa (WebSockets)' : 'Reconectando con el servidor...'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              color: isWsConnected ? '#4ADE80' : 'var(--text-muted)',
              backgroundColor: isWsConnected ? 'rgba(74, 222, 128, 0.1)' : 'rgba(103, 97, 130, 0.1)',
              padding: '4px 10px',
              borderRadius: '9999px',
              border: `1px solid ${isWsConnected ? 'rgba(74, 222, 128, 0.25)' : 'rgba(103, 97, 130, 0.2)'}`,
            }}
          >
            {isWsConnected ? (
              <>
                <Wifi size={13} style={{ color: '#4ADE80' }} aria-hidden="true" />
                <span style={{ fontWeight: 600 }}>En vivo</span>
              </>
            ) : (
              <>
                <WifiOff size={13} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
                <span>Desconectado</span>
              </>
            )}
          </div>

          {/* Active Collaborators Avatars */}
          {activeCollaborators.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginRight: '2px' }}>
                Colaborando:
              </span>
              <div style={{ display: 'flex', alignItems: 'center', margin: '0 -2px' }}>
                {activeCollaborators.slice(0, 4).map((collab) => {
                  const initials = collab.nombre
                    ? collab.nombre.substring(0, 2).toUpperCase()
                    : collab.email.substring(0, 2).toUpperCase();
                  return (
                    <div
                      key={collab.id}
                      title={`${collab.nombre || collab.email} (En línea)`}
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        backgroundColor: '#7C5CFC',
                        border: '2px solid var(--bg-sidebar)',
                        color: '#FFFFFF',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: '-6px',
                      }}
                    >
                      {initials}
                    </div>
                  );
                })}
                {activeCollaborators.length > 4 && (
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--bg-elevated)',
                      border: '2px solid var(--bg-sidebar)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: '-6px',
                    }}
                  >
                    +{activeCollaborators.length - 4}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportJSON}
            title="Exportar archivo JSON UML"
            style={{ padding: '8px 14px', fontSize: '0.82rem' }}
          >
            <Download size={15} aria-hidden="true" />
            <span>Exportar JSON</span>
          </button>

          <button
            type="button"
            className={`btn ${isInspectorOpen ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setIsInspectorOpen((prev) => !prev)}
            title="Mostrar / Ocultar Inspector de propiedades"
            style={{ padding: '8px 12px', fontSize: '0.82rem' }}
          >
            <SlidersHorizontal size={16} aria-hidden="true" />
            <span>Inspector</span>
          </button>
        </div>
      </div>

      {/* Canvas Workspace Area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Floating Toolbar */}
        <UMLToolbar
          activeTool={activeTool}
          selectedRelType={selectedRelType}
          zoom={viewport.zoom}
          isSaving={isSaving}
          version={diagram.version}
          onSelectTool={setActiveTool}
          onChangeRelType={setSelectedRelType}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetZoom={handleResetZoom}
          isInspectorOpen={isInspectorOpen}
        />

        {/* Canvas Engine */}
        <UMLCanvas
          semanticData={semanticData}
          visualData={canvasVisualData}
          activeTool={activeTool}
          selectedRelType={selectedRelType}
          selectedElementId={selectedElementId}
          selectedElementType={selectedElementType}
          viewport={viewport}
          onViewportChange={handleViewportChange}
          onSelectElement={handleSelectElement}
          onCreateClassAt={handleCreateClassAt}
          onMoveNode={handleMoveNode}
          onMoveNodeEnd={handleMoveNodeEnd}
          onCreateRelationship={handleCreateRelationship}
        />

        {/* Right Drawer Inspector */}
        <UMLInspector
          selectedClass={selectedClass}
          selectedRelationship={selectedRelationship}
          allClasses={semanticData.classes}
          isOpen={isInspectorOpen}
          onClose={() => setIsInspectorOpen(false)}
          onUpdateClass={handleUpdateClass}
          onDeleteClass={handleDeleteClass}
          onUpdateRelationship={handleUpdateRelationship}
          onDeleteRelationship={handleDeleteRelationship}
        />
      </div>
    </div>
  );
};

export default DiagramEditor;
