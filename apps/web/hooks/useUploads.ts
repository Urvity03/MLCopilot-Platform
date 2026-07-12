'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadsService } from '../services/uploads';
import { Upload } from '../types';

export function useUploads(projectId: string) {
  const queryClient = useQueryClient();

  const uploadsQuery = useQuery<Upload[]>({
    queryKey: ['uploads', projectId],
    queryFn: () => uploadsService.list(projectId),
    enabled: !!projectId,
    refetchInterval: 5000, // Poll every 5 seconds to track parsing/embedding progress automatically!
  });

  const uploadFileMutation = useMutation({
    mutationFn: ({ file }: { file: File }) => uploadsService.uploadFile(projectId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uploads', projectId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    },
  });

  return {
    uploads: uploadsQuery.data || [],
    isLoading: uploadsQuery.isLoading,
    isError: uploadsQuery.isError,
    error: uploadsQuery.error,
    refetch: uploadsQuery.refetch,
    uploadFile: uploadFileMutation.mutateAsync,
    isUploading: uploadFileMutation.isPending,
  };
}
