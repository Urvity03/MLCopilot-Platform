import { client } from './client';
import { User, TokenResponse } from '../types';
import { getApiBaseUrl } from '../lib/config';

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  remember_me?: boolean;
}

export const authService = {
  async register(data: RegisterPayload): Promise<User> {
    const response = await client.post<User>('/auth/register', data);
    return response.data;
  },

  async login(data: LoginPayload): Promise<TokenResponse> {
    const response = await client.post<TokenResponse>('/auth/login', data);
    return response.data;
  },

  async me(): Promise<User> {
    const response = await client.get<User>('/auth/me');
    return response.data;
  },

  async logout(): Promise<void> {
    await client.post('/auth/logout', {});
  },

  async refresh(): Promise<TokenResponse> {
    const response = await client.post<TokenResponse>('/auth/refresh', {});
    return response.data;
  },

  async forgotPassword(email: string): Promise<{ message: string; reset_link?: string }> {
    const response = await client.post<{ message: string; reset_link?: string }>('/auth/forgot-password', { email });
    return response.data;
  },

  async resetPassword(token: string, new_password: string): Promise<void> {
    await client.post('/auth/reset-password', { token, new_password });
  },

  async getConnectedAccounts(): Promise<Array<{ id: string; provider: string; provider_email?: string; provider_name?: string; provider_avatar?: string; created_at: string }>> {
    const response = await client.get('/auth/oauth/accounts');
    return response.data;
  },

  async disconnectAccount(provider: string): Promise<void> {
    await client.delete(`/auth/oauth/accounts/${provider}`);
  },

  getGoogleAuthUrl(): string {
    return `${getApiBaseUrl()}/auth/oauth/google`;
  },

  getGithubAuthUrl(): string {
    return `${getApiBaseUrl()}/auth/oauth/github`;
  },
};
