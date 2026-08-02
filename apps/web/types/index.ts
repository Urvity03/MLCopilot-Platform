export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string;
  avatar_url?: string | null;
}

export type RoleType = 'owner' | 'admin' | 'member' | 'viewer';

export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string;
  created_by: string;
  created_at: string;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  role: RoleType;
  added_at: string;
  user?: User;
}

export type UploadKind = 'paper' | 'notebook';
export type ParseStatus = 'pending' | 'parsing' | 'parsed' | 'failed';
export type EmbeddingStatus = 'pending' | 'embedding' | 'embedded' | 'failed';

export interface Upload {
  id: string;
  project_id: string;
  kind: UploadKind;
  filename: string;
  storage_uri: string;
  parse_status: ParseStatus;
  embedding_status: EmbeddingStatus;
  metadata: Record<string, any>;
  uploaded_by: string;
  created_at: string;
}

export interface ParsedChunk {
  id: string;
  upload_id: string;
  position: number;
  content: string;
  metadata: Record<string, any>;
}

export interface Citation {
  upload_id: string;
  filename: string;
  chunk_id: string;
  content: string;
  position: number;
  score: number;
}

export interface Conversation {
  id: string;
  project_id: string;
  title: string;
  created_by: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[];
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}
