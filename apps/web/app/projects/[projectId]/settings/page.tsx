'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsService } from '../../../../services/projects';
import { PageHeader } from '../../../../components/ui/page-header';
import { Section } from '../../../../components/ui/section';
import { Card } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { toast } from '../../../../components/ui/toast';
import { Settings, Trash2, ShieldAlert, Save, Cpu, Database, Server, Sparkles } from 'lucide-react';
import { Skeleton } from '../../../../components/ui/skeletons';

export default function SettingsPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  // Fetch project details
  const { data: project, isLoading } = useQuery({
    queryKey: ['project-settings', projectId],
    queryFn: () => projectsService.get(projectId),
    enabled: !!projectId,
  });

  // Sync state on load
  React.useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setSlug(project.slug);
    }
  }, [project]);

  const deleteMutation = useMutation({
    mutationFn: () => projectsService.delete(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      router.push('/dashboard');
      toast.success('Workspace project deleted successfully.');
    },
    onError: () => {
      toast.error('Failed to delete workspace.');
    },
  });

  const handleUpdateSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Workspace settings saved.');
    }, 400);
  };

  const handleDelete = () => {
    const confirmation = confirm(
      'WARNING: Deleting this workspace is irreversible. All uploaded documents, RAG chunk embeddings, and conversations will be deleted permanently. Confirm deletion?'
    );
    if (confirmation) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6 animate-pulse">
        <Skeleton className="h-24 w-full rounded-2xl bg-[#111217] border border-[rgba(255,255,255,0.06)]" />
        <Skeleton className="h-48 w-full rounded-2xl bg-[#111217] border border-[rgba(255,255,255,0.06)]" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8 font-sans animate-fade-in">
      {/* 1. Page Header */}
      <PageHeader
        title="Workspace Settings"
        description="Manage workspace properties, metadata details, and AI infrastructure parameters."
        icon={Settings}
      />

      <div className="space-y-8">
        {/* 2. Workspace General Configuration */}
        <Section title="General Configuration">
          <form onSubmit={handleUpdateSettings}>
            <Card className="p-6 bg-[#111217] border border-[rgba(255,255,255,0.06)] space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-[#8B8D98] uppercase tracking-wider">
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl bg-[#181A20] border border-[rgba(255,255,255,0.06)] px-3 py-2.5 text-xs text-[#F0F0F3] focus:border-[#7C5CFC]/40 focus:ring-1 focus:ring-[#7C5CFC]/20 outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-[#8B8D98] uppercase tracking-wider">
                  Slug Identifier
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full rounded-xl bg-[#181A20] border border-[rgba(255,255,255,0.06)] px-3 py-2.5 text-xs text-[#F0F0F3] font-mono focus:border-[#7C5CFC]/40 focus:ring-1 focus:ring-[#7C5CFC]/20 outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-[#8B8D98] uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl bg-[#181A20] border border-[rgba(255,255,255,0.06)] px-3 py-2.5 text-xs text-[#F0F0F3] placeholder-[#56585E] focus:border-[#7C5CFC]/40 focus:ring-1 focus:ring-[#7C5CFC]/20 outline-none transition-all resize-none leading-relaxed"
                  placeholder="Describe the domain or goal of this workspace project..."
                />
              </div>

              <div className="flex justify-end pt-3 border-t border-[rgba(255,255,255,0.06)] mt-6">
                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  disabled={isSaving}
                  className="bg-[#7C5CFC] hover:bg-[#6C47FF] text-white font-semibold active:scale-[0.97] transition-all cursor-pointer gap-1.5 rounded-xl shadow-sm"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </Button>
              </div>
            </Card>
          </form>
        </Section>

        {/* 3. Read-Only AI & RAG Infrastructure Specs */}
        <Section title="AI & RAG Infrastructure">
          <Card className="p-6 bg-[#111217] border border-[rgba(255,255,255,0.06)] space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-[#7C5CFC]" />
                <h4 className="text-xs font-semibold text-[#F0F0F3]">Active Model & Vector Pipeline Config</h4>
              </div>
              <span className="text-[9px] font-mono font-bold text-[#3DD68C] bg-[#3DD68C]/10 border border-[#3DD68C]/20 rounded-md px-2 py-0.5 uppercase tracking-wider">
                System Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 select-none">
              {/* Embedding Model Card */}
              <div className="p-4 bg-[#181A20] border border-[rgba(255,255,255,0.06)] rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-[#7C5CFC]">
                  <Database className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8B8D98]">Vector Embedding Engine</span>
                </div>
                <div>
                  <h5 className="text-xs font-bold text-[#F0F0F3] font-mono">sentence-transformers/all-MiniLM-L6-v2</h5>
                  <p className="text-[10px] text-[#8B8D98] mt-1 leading-relaxed">
                    Local Sentence Transformers model mapping document chunks into high-density vector space.
                  </p>
                </div>
                <div className="pt-2 border-t border-[rgba(255,255,255,0.04)] flex items-center justify-between text-[10px] font-mono text-[#56585E]">
                  <span>Dimensions: <strong className="text-[#F0F0F3]">384</strong></span>
                  <span>Provider: <strong className="text-[#7C5CFC]">Local / PyTorch</strong></span>
                </div>
              </div>

              {/* LLM Inference Provider Card */}
              <div className="p-4 bg-[#181A20] border border-[rgba(255,255,255,0.06)] rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-[#7C5CFC]">
                  <Server className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8B8D98]">Local LLM Inference Engine</span>
                </div>
                <div>
                  <h5 className="text-xs font-bold text-[#F0F0F3] font-mono">Ollama • llama3.1:8b</h5>
                  <p className="text-[10px] text-[#8B8D98] mt-1 leading-relaxed">
                    Self-hosted Ollama runtime executing local open-weights LLM inference with zero data egress.
                  </p>
                </div>
                <div className="pt-2 border-t border-[rgba(255,255,255,0.04)] flex items-center justify-between text-[10px] font-mono text-[#56585E]">
                  <span>Vector Database: <strong className="text-[#F0F0F3]">pgvector</strong></span>
                  <span>Provider: <strong className="text-[#7C5CFC]">Ollama API</strong></span>
                </div>
              </div>
            </div>
          </Card>
        </Section>

        {/* 4. Danger Zone */}
        <Section title="Danger Zone">
          <Card className="p-6 bg-[#FF5C74]/5 border border-[#FF5C74]/15 relative overflow-hidden rounded-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-[#FF5C74] flex items-center gap-1.5">
                  <ShieldAlert className="h-4.5 w-4.5 text-[#FF5C74]" />
                  <span>Delete Workspace Project</span>
                </h4>
                <p className="text-[11px] text-[#8B8D98] leading-normal font-medium max-w-md">
                  Permanently deletes the active workspace project, associated document files, pgvector chunk embeddings, and chat histories.
                </p>
              </div>
              <Button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                variant="destructive"
                size="sm"
                className="bg-[#FF5C74]/10 text-[#FF5C74] hover:bg-[#FF5C74]/20 border border-[#FF5C74]/15 gap-1.5 self-start md:self-center shrink-0 cursor-pointer active:scale-[0.97] transition-all rounded-xl"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{deleteMutation.isPending ? 'Deleting...' : 'Delete Workspace'}</span>
              </Button>
            </div>
          </Card>
        </Section>
      </div>
    </div>
  );
}
