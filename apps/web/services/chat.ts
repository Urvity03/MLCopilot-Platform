import { client } from './client';
import { Conversation, ChatMessage } from '../types';
import { useAuthStore } from '../store/auth';

export interface ConversationDetail extends Conversation {
  messages: ChatMessage[];
}

export interface ChatPayload {
  question: string;
  conversation_id?: string;
  stream?: boolean;
}

export interface ChatStreamCallbacks {
  onMetadata?: (data: { conversation_id: string; citations: any[] }) => void;
  onToken?: (token: string) => void;
  onDone?: () => void;
  onError?: (err: Error) => void;
}

export const chatService = {
  async listConversations(projectId: string): Promise<Conversation[]> {
    const response = await client.get<Conversation[]>(`/projects/${projectId}/conversations`);
    return response.data;
  },

  async getConversationDetails(projectId: string, conversationId: string): Promise<ConversationDetail> {
    const response = await client.get<ConversationDetail>(`/projects/${projectId}/conversations/${conversationId}`);
    return response.data;
  },

  async deleteConversation(projectId: string, conversationId: string): Promise<void> {
    await client.delete(`/projects/${projectId}/conversations/${conversationId}`);
  },

  async renameConversation(projectId: string, conversationId: string, title: string): Promise<Conversation> {
    const response = await client.patch<Conversation>(`/projects/${projectId}/conversations/${conversationId}`, { title });
    return response.data;
  },

  async chat(projectId: string, payload: ChatPayload): Promise<{ content: string; citations: any[] }> {
    const response = await client.post(`/projects/${projectId}/chat`, {
      ...payload,
      stream: false,
    });
    return response.data;
  },

  async chatStream(
    projectId: string,
    payload: ChatPayload,
    callbacks: ChatStreamCallbacks
  ): Promise<void> {
    const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
    const baseUrl = rawBaseUrl.endsWith('/api/v1') ? rawBaseUrl : `${rawBaseUrl.replace(/\/+$/, '')}/api/v1`;
    const token = useAuthStore.getState().accessToken;

    const response = await fetch(`${baseUrl}/projects/${projectId}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        question: payload.question,
        conversation_id: payload.conversation_id || null,
        stream: true,
      }),
    });

    if (!response.ok) {
      let errDetail = response.statusText || `HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson.error && errJson.error.message) {
          errDetail = errJson.error.message;
        } else if (errJson.detail) {
          errDetail = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
        }
      } catch (_) {}
      throw new Error(`Chat request failed (${response.status}): ${errDetail}`);
    }

    if (!response.body) {
      throw new Error('Response body stream is not available');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() || '';

      for (const block of blocks) {
        if (!block.trim()) continue;
        const lines = block.split('\n');
        let eventType = '';
        let dataStr = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            dataStr = line.slice(6).trim();
          }
        }

        if (!dataStr) continue;

        console.log('[TRACE-7-BROWSER-RECEIVED-CHUNK]', new Date().toISOString(), { eventType, dataStr });

        try {
          const parsed = JSON.parse(dataStr);
          if (eventType === 'metadata') {
            console.log('[TRACE-8-BROWSER-CALLBACK-EXECUTED]', new Date().toISOString(), 'onMetadata', parsed);
            callbacks.onMetadata?.(parsed);
          } else if (eventType === 'message') {
            if (parsed.text !== undefined) {
              console.log('[TRACE-8-BROWSER-CALLBACK-EXECUTED]', new Date().toISOString(), 'onToken', parsed.text);
              callbacks.onToken?.(parsed.text);
            }
          } else if (eventType === 'error' || parsed.error) {
            const errMessage = parsed.error?.message || (typeof parsed.error === 'string' ? parsed.error : 'Streaming generation failed.');
            console.log('[TRACE-8-BROWSER-CALLBACK-EXECUTED]', new Date().toISOString(), 'onError', errMessage);
            callbacks.onError?.(new Error(errMessage));
          } else if (eventType === 'done') {
            console.log('[TRACE-8-BROWSER-CALLBACK-EXECUTED]', new Date().toISOString(), 'onDone');
            callbacks.onDone?.();
          }
        } catch (e) {
          console.error('Error parsing SSE payload:', dataStr, e);
        }
      }
    }
  },
};

