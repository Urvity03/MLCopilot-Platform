import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiKeysService } from '../services/apiKeys';

export function useApiKeys() {
  const queryClient = useQueryClient();

  const { data: apiKeys = [], isLoading, isError } = useQuery({
    queryKey: ['api-keys'],
    queryFn: apiKeysService.list,
  });

  const createApiKeyMutation = useMutation({
    mutationFn: (name: string) => apiKeysService.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  const deleteApiKeyMutation = useMutation({
    mutationFn: (keyId: string) => apiKeysService.delete(keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  return {
    apiKeys,
    isLoading,
    isError,
    createApiKey: createApiKeyMutation.mutateAsync,
    isCreating: createApiKeyMutation.isPending,
    deleteApiKey: deleteApiKeyMutation.mutateAsync,
    isDeleting: deleteApiKeyMutation.isPending,
  };
}
