import { client } from './client';
import { User, TokenResponse } from '../types';

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
}

export interface LoginPayload {
  email: string;
  password: string;
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

  async logout(): Promise<void> {
    await client.post('/auth/logout', {});
  },

  async refresh(): Promise<TokenResponse> {
    const response = await client.post<TokenResponse>('/auth/refresh', {});
    return response.data;
  },
};
