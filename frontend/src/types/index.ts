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
  role: number;
  role_name: string;
  token: string;
  status: 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'CANCELADA';
  created_by: number;
  created_by_email: string;
  is_expired: boolean;
  created_at: string;
  expires_at: string;
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
