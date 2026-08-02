'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Sparkles, X } from 'lucide-react';
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
      <DialogContent className="max-w-md p-0 overflow-hidden bg-[#111217] border border-[rgba(255,255,255,0.06)] rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[rgba(255,255,255,0.06)] bg-[#0D0D10]/50">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F0F0F3]">Create Workspace Project</h3>
              <p className="text-[11px] text-[#56585E]">Initialize vector store & RAG context partition</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#56585E] hover:text-[#F0F0F3] hover:bg-[#181A20] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#8B8D98]">
              Project Name <span className="text-[#FF5C74]">*</span>
            </label>
            <input
              type="text"
              {...register('name')}
              placeholder="e.g. Sentence Transformers"
              className="w-full rounded-xl bg-[#181A20] border border-[rgba(255,255,255,0.06)] px-3 py-2.5 text-xs text-[#F0F0F3] placeholder-[#56585E] focus:border-[var(--primary)]/40 focus:ring-1 focus:ring-[var(--primary)]/20 outline-none transition-all"
              disabled={isCreating}
            />
            {errors.name && <p className="text-[10px] text-[#FF5C74] font-medium">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#8B8D98]">Workspace URL Slug</label>
            <input
              type="text"
              {...register('slug')}
              placeholder="sentence-transformers"
              className="w-full rounded-xl bg-[#181A20] border border-[rgba(255,255,255,0.06)] px-3 py-2.5 text-xs text-[#F0F0F3] placeholder-[#56585E] focus:border-[var(--primary)]/40 focus:ring-1 focus:ring-[var(--primary)]/20 outline-none transition-all"
              disabled={isCreating}
            />
            {errors.slug && <p className="text-[10px] text-[#FF5C74] font-medium">{errors.slug.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#8B8D98]">Description (Optional)</label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Brief summary of research goals or document scope..."
              className="w-full rounded-xl bg-[#181A20] border border-[rgba(255,255,255,0.06)] px-3 py-2.5 text-xs text-[#F0F0F3] placeholder-[#56585E] focus:border-[var(--primary)]/40 focus:ring-1 focus:ring-[var(--primary)]/20 outline-none transition-all resize-none leading-relaxed"
              disabled={isCreating}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[rgba(255,255,255,0.06)]">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8B8D98] hover:text-[#F0F0F3] hover:bg-[#181A20] transition-colors cursor-pointer"
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary)]/90 border border-[var(--primary)]/10 active:scale-[0.97] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center gap-1.5 shadow-lg shadow-[var(--primary)]/20"
            >
              {isCreating ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Project</span>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
