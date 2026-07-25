import { client } from './client';
import { Project, ProjectMember, RoleType } from '../types';

export interface CreateProjectPayload {
  name: string;
  slug: string;
  description: string;
}

export interface InviteMemberPayload {
  user_id: string;
  role: 'admin' | 'member' | 'viewer';
}

export const projectsService = {
  async list(): Promise<Project[]> {
    const response = await client.get<Project[]>('/projects');
    return response.data;
  },

  async create(data: CreateProjectPayload): Promise<Project> {
    const response = await client.post<Project>('/projects', data);
    return response.data;
  },

  async get(projectId: string): Promise<Project> {
    const response = await client.get<Project>(`/projects/${projectId}`);
    return response.data;
  },

  async delete(projectId: string): Promise<void> {
    await client.delete(`/projects/${projectId}`);
  },

  async listMembers(projectId: string): Promise<ProjectMember[]> {
    const response = await client.get<ProjectMember[]>(`/projects/${projectId}/members`);
    return response.data;
  },

  async inviteMember(projectId: string, payload: InviteMemberPayload): Promise<ProjectMember> {
    const response = await client.post<ProjectMember>(`/projects/${projectId}/members`, payload);
    return response.data;
  },

  async updateMemberRole(projectId: string, userId: string, role: RoleType): Promise<ProjectMember> {
    const response = await client.patch<ProjectMember>(`/projects/${projectId}/members/${userId}`, { role });
    return response.data;
  },

  async removeMember(projectId: string, userId: string): Promise<void> {
    await client.delete(`/projects/${projectId}/members/${userId}`);
  },
};
