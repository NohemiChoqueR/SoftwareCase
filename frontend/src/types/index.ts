export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  date_joined?: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  owner: number;
  owner_email: string;
  created_at: string;
  updated_at: string;
}

export interface Collaborator {
  id: number;
  project: number;
  user: number;
  user_email: string;
  role: number;
  role_name: string;
  joined_at: string;
}

export interface Permission {
  code: string;
  name: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  created_at: string;
}

export interface Invitation {
  id: number;
  project: number;
  project_name: string;
  role: number;
  role_name: string;
  guest_email: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  created_by_email: string;
  created_at: string;
}

export interface PublicInvitation {
  token: string;
  project_id: number;
  project_name: string;
  project_description: string;
  role_id: number;
  role_name: string;
  inviter_email: string;
  inviter_name: string;
  status: 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'CANCELADA';
  is_expired: boolean;
  expires_at: string;
}

// -------------------------------------------------------------
// UML 2.5 Metamodel & Diagram Types
// -------------------------------------------------------------

export type UMLVisibility = 'public' | 'private' | 'protected' | 'package';

export type UMLRelationshipType =
  | 'inheritance'
  | 'realization'
  | 'association'
  | 'aggregation'
  | 'composition'
  | 'dependency';

export interface UMLAttribute {
  id: string;
  name: string;
  type: string;
  visibility: UMLVisibility;
  default_value?: string | null;
}

export interface UMLParameter {
  name: string;
  type: string;
}

export interface UMLMethod {
  id: string;
  name: string;
  return_type: string;
  visibility: UMLVisibility;
  parameters: UMLParameter[];
}

export interface UMLClass {
  id: string;
  name: string;
  is_abstract: boolean;
  is_interface: boolean;
  stereotype?: string | null;
  attributes: UMLAttribute[];
  methods: UMLMethod[];
}

export interface UMLRelationship {
  id: string;
  type: UMLRelationshipType;
  source_id: string;
  target_id: string;
  name?: string;
  source_role?: string;
  target_role?: string;
  source_multiplicity?: string;
  target_multiplicity?: string;
}

export interface UMLVisualNode {
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string | null;
}

export interface UMLVisualConnection {
  bendpoints?: Array<{ x: number; y: number }>;
}

export interface UMLViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface UMLSemanticData {
  classes: UMLClass[];
  relationships: UMLRelationship[];
}

export interface UMLVisualData {
  nodes: Record<string, UMLVisualNode>;
  connections: Record<string, UMLVisualConnection>;
  viewport: UMLViewport;
}

export interface Diagram {
  id: number;
  project: number;
  name: string;
  description: string;
  diagram_type: string;
  version: number;
  semantic_data?: UMLSemanticData;
  visual_data?: UMLVisualData;
  class_count?: number;
  relationship_count?: number;
  created_by_email?: string;
  user_can_edit?: boolean;
  created_at: string;
  updated_at: string;
}

export type UMLMutationAction =
  | 'ADD_NODE'
  | 'UPDATE_NODE'
  | 'DELETE_NODE'
  | 'ADD_RELATIONSHIP'
  | 'UPDATE_RELATIONSHIP'
  | 'DELETE_RELATIONSHIP'
  | 'MOVE_NODE'
  | 'UPDATE_VIEWPORT';

export interface UMLMutationPayload {
  action: UMLMutationAction;
  payload: Record<string, unknown>;
}

