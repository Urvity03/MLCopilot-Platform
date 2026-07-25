import { client } from './client';
import { Upload } from '../types';

export const uploadsService = {
  async list(projectId: string): Promise<Upload[]> {
    const response = await client.get<Upload[]>(`/projects/${projectId}/uploads`);
    return response.data;
  },

  async uploadFile(projectId: string, file: File): Promise<Upload> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await client.post<Upload>(
      `/projects/${projectId}/uploads`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  async get(projectId: string, uploadId: string): Promise<Upload> {
    const response = await client.get<Upload>(`/projects/${projectId}/uploads/${uploadId}`);
    return response.data;
  },
};
