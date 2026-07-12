'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Sparkles } from 'lucide-react';
import { useProjects } from '../../hooks/useProjects';
import { Button } from '../ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '../ui/dialog';

const projectSchema = z.object({
  name: z.string().min(1, { message: 'Project name is required.' }).max(255),
  slug: z.string().min(1, { message: 'Slug is required.' }).max(255),
  description: z.string().max(1024).optional(),
});

type ProjectFields = z.infer<typeof projectSchema>;

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewProjectModal({ isOpen, onClose }: NewProjectModalProps) {
  const { createProject, isCreating } = useProjects();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ProjectFields>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
    },
  });

  const projectName = watch('name');

  // Auto-generate slug from project name
  React.useEffect(() => {
    if (projectName) {
      const generatedSlug = projectName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setValue('slug', generatedSlug, { shouldValidate: true });
    }
  }, [projectName, setValue]);

  const onSubmit = (data: ProjectFields) => {
    createProject(
      {
        name: data.name,
        slug: data.slug,
        description: data.description || '',
      },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-emerald-400" />
            <span>Create Workspace</span>
          </DialogTitle>
          <DialogDescription>
            Create a new workspace project to ingest research files and start querying.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Project Name
            </label>
            <input
              type="text"
              {...register('name')}
              placeholder="e.g. Sentence Transformers"
              className="w-full rounded-lg bg-zinc-900/50 border border-zinc-800/80 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition"
              disabled={isCreating}
            />
            {errors.name && (
              <p className="text-[10px] text-red-400 font-medium">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Workspace URL Slug
            </label>
            <input
              type="text"
              {...register('slug')}
              placeholder="sentence-transformers"
              className="w-full rounded-lg bg-zinc-900/50 border border-zinc-800/80 px-3 py-2 text-xs text-zinc-150 placeholder-zinc-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition"
              disabled={isCreating}
            />
            {errors.slug && (
              <p className="text-[10px] text-red-400 font-medium">{errors.slug.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Description (Optional)
            </label>
            <textarea
              {...register('description')}
              placeholder="Provide a brief summary of the workspace corpus..."
              rows={3}
              className="w-full rounded-lg bg-zinc-900/50 border border-zinc-800/80 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition resize-none"
              disabled={isCreating}
            />
            {errors.description && (
              <p className="text-[10px] text-red-400 font-medium">{errors.description.message}</p>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-200"
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/10"
              disabled={isCreating}
            >
              {isCreating ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                'Create Project'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
