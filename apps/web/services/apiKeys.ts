import { client } from './client';

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  prefix: string;
  scopes: string[];
  created_at: string;
  updated_at: string;
}

export interface ApiKeyCreateResponse {
  plain_key: string;
  api_key: ApiKey;
}

export const apiKeysService = {
  list: async (): Promise<ApiKey[]> => {
    const response = await client.get('/api-keys');
    return response.data;
  },
  create: async (name: string): Promise<ApiKeyCreateResponse> => {
    const response = await client.post('/api-keys', { name, scopes: ['read'] });
    return response.data;
  },
  delete: async (keyId: string): Promise<void> => {
    await client.delete(`/api-keys/${keyId}`);
  },
};
