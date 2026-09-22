import uuid
from rest_framework.exceptions import ValidationError


VALID_RELATIONSHIP_TYPES = {
    'inheritance',
    'realization',
    'association',
    'aggregation',
    'composition',
    'dependency',
}

VALID_VISIBILITIES = {'public', 'private', 'protected', 'package', '+', '-', '#', '~'}


class UMLMutationEngine:
    """
    Motor semántico para validar y aplicar mutaciones estructuradas sobre diagramas UML 2.5.
    Garantiza la estricta separación entre datos semánticos y visuales,
    así como la integridad relacional (p. ej. eliminación en cascada de conectores huérfanos).
    """

    @classmethod
    def apply_mutation(cls, diagram, action_type: str, payload: dict) -> dict:
        semantic = diagram.semantic_data or {"classes": [], "relationships": []}
        visual = diagram.visual_data or {"nodes": {}, "connections": {}, "viewport": {"x": 0, "y": 0, "zoom": 1.0}}

        classes = semantic.setdefault("classes", [])
        relationships = semantic.setdefault("relationships", [])
        nodes = visual.setdefault("nodes", {})
        connections = visual.setdefault("connections", {})

        handler_map = {
            'ADD_NODE': cls._add_node,
            'UPDATE_NODE': cls._update_node,
            'DELETE_NODE': cls._delete_node,
            'ADD_RELATIONSHIP': cls._add_relationship,
            'UPDATE_RELATIONSHIP': cls._update_relationship,
            'DELETE_RELATIONSHIP': cls._delete_relationship,
            'MOVE_NODE': cls._move_node,
            'UPDATE_VIEWPORT': cls._update_viewport,
        }

        handler = handler_map.get(action_type)
        if not handler:
            raise ValidationError(f"Tipo de mutación no soportado: '{action_type}'.")

        result = handler(classes, relationships, nodes, connections, visual, payload)

        diagram.semantic_data = semantic
        diagram.visual_data = visual
        diagram.version += 1
        diagram.save()

        return {
            "action": action_type,
            "version": diagram.version,
            "result": result,
            "diagram": {
                "id": diagram.id,
                "version": diagram.version,
                "semantic_data": diagram.semantic_data,
                "visual_data": diagram.visual_data,
                "updated_at": diagram.updated_at,
            }
        }

    @classmethod
    def apply_batch(cls, diagram, mutations: list) -> dict:
        results = []
        for mut in mutations:
            action = mut.get('action')
            payload = mut.get('payload', {})
            if not action:
                raise ValidationError("Cada elemento del batch debe contener 'action'.")
            
            # Ejecución secuencial acumulativa
            res = cls.apply_mutation(diagram, action, payload)
            results.append({
                "action": action,
                "result": res["result"]
            })

        return {
            "batch_size": len(mutations),
            "version": diagram.version,
            "results": results,
            "diagram": {
                "id": diagram.id,
                "version": diagram.version,
                "semantic_data": diagram.semantic_data,
                "visual_data": diagram.visual_data,
                "updated_at": diagram.updated_at,
            }
        }

    # -------------------------------------------------------------
    # Handlers Internos
    # -------------------------------------------------------------

    @staticmethod
    def _add_node(classes, relationships, nodes, connections, visual, payload):
        node_id = str(payload.get('id') or uuid.uuid4())
        name = str(payload.get('name', '')).strip()
        if not name:
            raise ValidationError("El nombre de la clase/interfaz es obligatorio.")

        # Verificar unicidad de ID
        if any(c['id'] == node_id for c in classes):
            raise ValidationError(f"Ya existe un elemento con ID '{node_id}'.")

        new_class = {
            "id": node_id,
            "name": name,
            "is_abstract": bool(payload.get('is_abstract', False)),
            "is_interface": bool(payload.get('is_interface', False)),
            "stereotype": payload.get('stereotype') or None,
            "attributes": payload.get('attributes', []),
            "methods": payload.get('methods', []),
        }
        classes.append(new_class)

        # Datos visuales iniciales
        pos = payload.get('position', {})
        size = payload.get('size', {})
        nodes[node_id] = {
            "x": float(pos.get('x', 120)),
            "y": float(pos.get('y', 100)),
            "width": float(size.get('width', 220)),
            "height": float(size.get('height', 160)),
            "color": payload.get('color') or None,
        }

        return {"node_id": node_id, "name": name}

    @staticmethod
    def _update_node(classes, relationships, nodes, connections, visual, payload):
        node_id = payload.get('id')
        if not node_id:
            raise ValidationError("El ID del elemento a actualizar es obligatorio.")

        target = next((c for c in classes if c['id'] == node_id), None)
        if not target:
            raise ValidationError(f"No se encontró el elemento UML con ID '{node_id}'.")

        # Actualizar campos semánticos provistos
        if 'name' in payload:
            name = str(payload['name']).strip()
            if not name:
                raise ValidationError("El nombre de la clase no puede estar vacío.")
            target['name'] = name

        if 'is_abstract' in payload:
            target['is_abstract'] = bool(payload['is_abstract'])
        if 'is_interface' in payload:
            target['is_interface'] = bool(payload['is_interface'])
        if 'stereotype' in payload:
            target['stereotype'] = payload['stereotype']
        if 'attributes' in payload:
            target['attributes'] = payload['attributes']
        if 'methods' in payload:
            target['methods'] = payload['methods']

        # Opcionalmente actualizar tamaño/color si vienen en la mutación
        if 'size' in payload and node_id in nodes:
            size = payload['size']
            if 'width' in size:
                nodes[node_id]['width'] = float(size['width'])
            if 'height' in size:
                nodes[node_id]['height'] = float(size['height'])
        if 'color' in payload and node_id in nodes:
            nodes[node_id]['color'] = payload['color']

        return {"node_id": node_id, "updated": True}

    @staticmethod
    def _delete_node(classes, relationships, nodes, connections, visual, payload):
        node_id = payload.get('id')
        if not node_id:
            raise ValidationError("El ID del elemento a eliminar es obligatorio.")

        original_class_len = len(classes)
        classes[:] = [c for c in classes if c['id'] != node_id]
        if len(classes) == original_class_len:
            raise ValidationError(f"No se encontró el elemento UML con ID '{node_id}'.")

        # Eliminar del layout visual
        nodes.pop(node_id, None)

        # Eliminación en cascada de relaciones conectadas a este nodo
        orphaned_rel_ids = [r['id'] for r in relationships if r['source_id'] == node_id or r['target_id'] == node_id]
        relationships[:] = [r for r in relationships if r['id'] not in orphaned_rel_ids]

        for r_id in orphaned_rel_ids:
            connections.pop(r_id, None)

        return {"node_id": node_id, "cascade_deleted_relationships": orphaned_rel_ids}

    @staticmethod
    def _add_relationship(classes, relationships, nodes, connections, visual, payload):
        rel_id = str(payload.get('id') or uuid.uuid4())
        rel_type = payload.get('type')
        source_id = payload.get('source_id')
        target_id = payload.get('target_id')

        if not rel_type or rel_type not in VALID_RELATIONSHIP_TYPES:
            raise ValidationError(
                f"Tipo de relación inválido: '{rel_type}'. Debe ser uno de: {', '.join(VALID_RELATIONSHIP_TYPES)}."
            )

        if not any(c['id'] == source_id for c in classes):
            raise ValidationError(f"El nodo origen con ID '{source_id}' no existe en el diagrama.")
        if not any(c['id'] == target_id for c in classes):
            raise ValidationError(f"El nodo destino con ID '{target_id}' no existe en el diagrama.")

        new_rel = {
            "id": rel_id,
            "type": rel_type,
            "source_id": source_id,
            "target_id": target_id,
            "name": payload.get('name', ''),
            "source_role": payload.get('source_role', ''),
            "target_role": payload.get('target_role', ''),
            "source_multiplicity": payload.get('source_multiplicity', ''),
            "target_multiplicity": payload.get('target_multiplicity', ''),
        }
        relationships.append(new_rel)

        # Configuración visual de la conexión
        connections[rel_id] = {
            "bendpoints": payload.get('bendpoints', []),
        }

        return {"relationship_id": rel_id, "type": rel_type, "source_id": source_id, "target_id": target_id}

    @staticmethod
    def _update_relationship(classes, relationships, nodes, connections, visual, payload):
        rel_id = payload.get('id')
        if not rel_id:
            raise ValidationError("El ID de la relación a actualizar es obligatorio.")

        target = next((r for r in relationships if r['id'] == rel_id), None)
        if not target:
            raise ValidationError(f"No se encontró la relación con ID '{rel_id}'.")

        if 'type' in payload:
            rel_type = payload['type']
            if rel_type not in VALID_RELATIONSHIP_TYPES:
                raise ValidationError(f"Tipo de relación inválido: '{rel_type}'.")
            target['type'] = rel_type

        for field in ('name', 'source_role', 'target_role', 'source_multiplicity', 'target_multiplicity'):
            if field in payload:
                target[field] = payload[field]

        if 'bendpoints' in payload:
            connections.setdefault(rel_id, {})['bendpoints'] = payload['bendpoints']

        return {"relationship_id": rel_id, "updated": True}

    @staticmethod
    def _delete_relationship(classes, relationships, nodes, connections, visual, payload):
        rel_id = payload.get('id')
        if not rel_id:
            raise ValidationError("El ID de la relación a eliminar es obligatorio.")

        orig_len = len(relationships)
        relationships[:] = [r for r in relationships if r['id'] != rel_id]
        if len(relationships) == orig_len:
            raise ValidationError(f"No se encontró la relación con ID '{rel_id}'.")

        connections.pop(rel_id, None)
        return {"relationship_id": rel_id, "deleted": True}

    @staticmethod
    def _move_node(classes, relationships, nodes, connections, visual, payload):
        node_id = payload.get('id')
        if not node_id:
            raise ValidationError("El ID del nodo a mover es obligatorio.")
        if node_id not in nodes:
            raise ValidationError(f"No existe información visual para el nodo con ID '{node_id}'.")

        if 'x' in payload:
            nodes[node_id]['x'] = float(payload['x'])
        if 'y' in payload:
            nodes[node_id]['y'] = float(payload['y'])
        if 'width' in payload:
            nodes[node_id]['width'] = float(payload['width'])
        if 'height' in payload:
            nodes[node_id]['height'] = float(payload['height'])

        return {"node_id": node_id, "position": {"x": nodes[node_id]['x'], "y": nodes[node_id]['y']}}

    @staticmethod
    def _update_viewport(classes, relationships, nodes, connections, visual, payload):
        viewport = visual.setdefault('viewport', {})
        if 'x' in payload:
            viewport['x'] = float(payload['x'])
        if 'y' in payload:
            viewport['y'] = float(payload['y'])
        if 'zoom' in payload:
            viewport['zoom'] = float(payload['zoom'])

        return {"viewport": viewport}
