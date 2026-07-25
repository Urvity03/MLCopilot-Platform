'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService, ChatPayload, ConversationDetail, ChatStreamCallbacks } from '../services/chat';
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

  const invalidateChatQueries = (targetConvId?: string) => {
    const cid = targetConvId || conversationId;
    if (cid) {
      queryClient.invalidateQueries({ queryKey: ['conversation-detail', projectId, cid] });
    }
    queryClient.invalidateQueries({ queryKey: ['conversations', projectId] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
  };

  const chatMutation = useMutation({
    mutationFn: (payload: ChatPayload) => chatService.chat(projectId, payload),
    onSuccess: () => {
      invalidateChatQueries();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (convId: string) => chatService.deleteConversation(projectId, convId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', projectId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    },
  });

  const sendMessageStream = async (payload: ChatPayload, callbacks: ChatStreamCallbacks) => {
    let resolvedConvId = payload.conversation_id || conversationId;

    return chatService.chatStream(projectId, payload, {
      ...callbacks,
      onMetadata: (data) => {
        if (data.conversation_id) {
          resolvedConvId = data.conversation_id;
        }
        callbacks.onMetadata?.(data);
      },
      onDone: () => {
        callbacks.onDone?.();
        invalidateChatQueries(resolvedConvId);
      },
    });
  };

  return {
    conversations: conversationsQuery.data || [],
    isLoadingConversations: conversationsQuery.isLoading,
    activeConversation: activeConversationQuery.data || null,
    isLoadingActiveConversation: activeConversationQuery.isLoading,
    sendMessage: chatMutation.mutateAsync,
    sendMessageStream,
    isSendingMessage: chatMutation.isPending,
    deleteConversation: deleteMutation.mutate,
    isDeletingConversation: deleteMutation.isPending,
    invalidateChatQueries,
  };
}

