import { client } from './client';
import { Conversation, ChatMessage } from '../types';

export interface ConversationDetail extends Conversation {
  messages: ChatMessage[];
}

export interface ChatPayload {
  question: string;
  conversation_id?: string;
  stream?: boolean;
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

  async chat(projectId: string, payload: ChatPayload): Promise<{ content: string; citations: any[] }> {
    const response = await client.post(`/projects/${projectId}/chat`, {
      ...payload,
      stream: false,
    });
    return response.data;
  },
};
