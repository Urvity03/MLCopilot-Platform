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

  const invalidateChatQueries = async (targetConvId?: string) => {
    const cid = targetConvId || conversationId;
    if (cid) {
      await queryClient.invalidateQueries({ queryKey: ['conversation-detail', projectId, cid] });
    }
    await queryClient.invalidateQueries({ queryKey: ['conversations', projectId] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
  };

  const chatMutation = useMutation({
    mutationFn: (payload: ChatPayload) => chatService.chat(projectId, payload),
    onSuccess: () => {
      invalidateChatQueries();
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ convId, title }: { convId: string; title: string }) => {
      try {
        return await chatService.renameConversation(projectId, convId, title);
      } catch (err) {
        return { id: convId, project_id: projectId, title, created_at: new Date().toISOString() };
      }
    },
    onMutate: async ({ convId, title }) => {
      await queryClient.cancelQueries({ queryKey: ['conversations', projectId] });
      const previousConversations = queryClient.getQueryData<Conversation[]>(['conversations', projectId]) || [];

      const exists = previousConversations.some((c) => c.id === convId);
      const updated = exists
        ? previousConversations.map((c) => (c.id === convId ? { ...c, title } : c))
        : [{ id: convId, project_id: projectId, title, created_at: new Date().toISOString() }, ...previousConversations];

      queryClient.setQueryData<Conversation[]>(['conversations', projectId], updated);

      return { previousConversations };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousConversations) {
        queryClient.setQueryData(['conversations', projectId], context.previousConversations);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (convId: string) => chatService.deleteConversation(projectId, convId),
    onMutate: async (deletedConvId: string) => {
      await queryClient.cancelQueries({ queryKey: ['conversations', projectId] });
      const previousConversations = queryClient.getQueryData<Conversation[]>(['conversations', projectId]);

      if (previousConversations) {
        queryClient.setQueryData<Conversation[]>(
          ['conversations', projectId],
          previousConversations.filter((c) => c.id !== deletedConvId)
        );
      }

      return { previousConversations };
    },
    onError: (_err, _deletedConvId, context) => {
      if (context?.previousConversations) {
        queryClient.setQueryData(['conversations', projectId], context.previousConversations);
      }
    },
    onSettled: () => {
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
        invalidateChatQueries(resolvedConvId).catch(() => {});
        callbacks.onDone?.();
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
    renameConversation: renameMutation.mutate,
    isRenamingConversation: renameMutation.isPending,
    invalidateChatQueries,
  };
}
