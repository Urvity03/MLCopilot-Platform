import { client } from './client';

export interface SearchPayload {
  query: string;
  top_k?: number;
}

export interface SearchResponseItem {
  upload_id: string;
  chunk_id: string;
  score: number;
  content: string;
  metadata: Record<string, any>;
}

export interface SearchResponse {
  results: SearchResponseItem[];
}

export const embeddingsService = {
  async search(projectId: string, payload: SearchPayload): Promise<SearchResponse> {
    const response = await client.post<SearchResponse>(`/projects/${projectId}/search`, payload);
    return response.data;
  },
};
