'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
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
  prefilledData?: { name: string; slug: string; description: string } | null;
}

export function NewProjectModal({ isOpen, onClose, prefilledData }: NewProjectModalProps) {
  const router = useRouter();
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

  // Load prefilled template data when workspace blueprint is selected
  React.useEffect(() => {
    if (isOpen) {
      if (prefilledData) {
        reset({
          name: prefilledData.name,
          slug: prefilledData.slug,
          description: prefilledData.description,
        });
      } else {
        reset({ name: '', slug: '', description: '' });
      }
    }
  }, [isOpen, prefilledData, reset]);

  // Auto-generate slug from project name
  React.useEffect(() => {
    if (projectName && !prefilledData) {
      const generatedSlug = projectName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setValue('slug', generatedSlug, { shouldValidate: true });
    }
  }, [projectName, setValue, prefilledData]);

  const onSubmit = (data: ProjectFields) => {
    createProject(
      {
        name: data.name,
        slug: data.slug,
        description: data.description || '',
      },
      {
        onSuccess: (project) => {
          reset();
          onClose();
          router.push(`/projects/${project.id}`);
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#7C5CFC]" />
            <span>Create Workspace</span>
          </DialogTitle>
          <DialogDescription>
            Create a new workspace project to ingest research files and start querying.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-semibold text-[#8B8D98] uppercase tracking-wider">
              Project Name
            </label>
            <input
              type="text"
              {...register('name')}
              placeholder="e.g. Sentence Transformers"
              className="w-full rounded-xl bg-[#111217] border border-[rgba(255,255,255,0.06)] px-3 py-2.5 text-xs text-[#F0F0F3] placeholder-[#56585E] focus:border-[#7C5CFC]/40 focus:ring-1 focus:ring-[#7C5CFC]/20 outline-none transition-all"
              disabled={isCreating}
            />
            {errors.name && (
              <p className="text-[10px] text-[#FF5C74] font-medium">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-semibold text-[#8B8D98] uppercase tracking-wider">
              Workspace URL Slug
            </label>
            <input
              type="text"
              {...register('slug')}
              placeholder="sentence-transformers"
              className="w-full rounded-xl bg-[#111217] border border-[rgba(255,255,255,0.06)] px-3 py-2.5 text-xs text-[#F0F0F3] placeholder-[#56585E] focus:border-[#7C5CFC]/40 focus:ring-1 focus:ring-[#7C5CFC]/20 outline-none transition-all"
              disabled={isCreating}
            />
            {errors.slug && (
              <p className="text-[10px] text-[#FF5C74] font-medium">{errors.slug.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-semibold text-[#8B8D98] uppercase tracking-wider">
              Description (Optional)
            </label>
            <textarea
              {...register('description')}
              placeholder="Provide a brief summary of the workspace corpus..."
              rows={3}
              className="w-full rounded-xl bg-[#111217] border border-[rgba(255,255,255,0.06)] px-3 py-2.5 text-xs text-[#F0F0F3] placeholder-[#56585E] focus:border-[#7C5CFC]/40 focus:ring-1 focus:ring-[#7C5CFC]/20 outline-none transition-all resize-none"
              disabled={isCreating}
            />
            {errors.description && (
              <p className="text-[10px] text-[#FF5C74] font-medium">{errors.description.message}</p>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-[#8B8D98] hover:text-[#F0F0F3] hover:bg-[#1E2028]"
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              className="bg-[#7C5CFC] hover:bg-[#6B4FE0] text-white border border-[#7C5CFC]/10 active:scale-[0.97]"
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
