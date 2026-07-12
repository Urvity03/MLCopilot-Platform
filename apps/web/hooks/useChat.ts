'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService, ChatPayload, ConversationDetail } from '../services/chat';
import { Conversation } from '../types';

export function useChat(projectId: string, conversationId?: string) {
  const queryClient = useQueryClient();

  const conversationsQuery = useQuery<Conversation[]>({
    queryKey: ['conversations', projectId],
    queryFn: () => chatService.listConversations(projectId),
    enabled: !!projectId,
  });

  const activeConversationQuery = useQuery<ConversationDetail>({
    queryKey: ['conversation-detail', projectId, conversationId],
    queryFn: () => chatService.getConversationDetails(projectId, conversationId!),
    enabled: !!projectId && !!conversationId,
  });

  const chatMutation = useMutation({
    mutationFn: (payload: ChatPayload) => chatService.chat(projectId, payload),
    onSuccess: () => {
      // Invalidate the detail query to fetch the updated message list
      if (conversationId) {
        queryClient.invalidateQueries({ queryKey: ['conversation-detail', projectId, conversationId] });
      }
      queryClient.invalidateQueries({ queryKey: ['conversations', projectId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (convId: string) => chatService.deleteConversation(projectId, convId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', projectId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    },
  });

  return {
    conversations: conversationsQuery.data || [],
    isLoadingConversations: conversationsQuery.isLoading,
    activeConversation: activeConversationQuery.data || null,
    isLoadingActiveConversation: activeConversationQuery.isLoading,
    sendMessage: chatMutation.mutateAsync,
    isSendingMessage: chatMutation.isPending,
    deleteConversation: deleteMutation.mutate,
    isDeletingConversation: deleteMutation.isPending,
  };
}
