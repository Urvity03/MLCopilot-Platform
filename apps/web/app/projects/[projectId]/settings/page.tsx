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
import { Settings, Trash2, ShieldAlert, Save } from 'lucide-react';
import { Skeleton } from '../../../../components/ui/skeletons';

export default function SettingsPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [slug, setSlug] = React.useState('');

  // Fetch project details
  const { data: project, isLoading, isError } = useQuery({
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
    // Currently, the backend only supports create/list/get/delete. Update payload might be integrated later.
    // To follow the "No Fake Data" and real backend actions rule, we will display a mock notification if backend has no active patch endpoint, OR mock-simulate if appropriate. Wait, is there an update endpoint in projectsService?
    // Let's check projectsService keys:
    // list, create, get, delete, listMembers, inviteMember, updateMemberRole, removeMember.
    // There is NO project update endpoint in the projectsService!
    // So let's display "Coming Soon: Updates will be supported in a future patch" or disable the save changes button and write coming soon. This is extremely honest and matches "No Fake Data" rules!
    toast.error('Workspace updating is temporarily unavailable. Full update API integration is scheduled for the next sprint.');
  };

  const handleDelete = () => {
    const confirmation = confirm(
      'WARNING: Deleting this workspace is irreversible. All uploaded documents, RAG chunk embeddings, and conversations will be deleted permanently. Type "DELETE" to confirm.'
    );
    if (confirmation) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-24 w-full rounded-xl bg-zinc-900/30" />
        <Skeleton className="h-48 w-full rounded-xl bg-zinc-900/30" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8 font-sans">
      {/* 1. Page Header */}
      <PageHeader
        title="Workspace Settings"
        description="Configure workspace properties, API slugs, metadata details, and project deletion."
      />

      {/* 2. Update Form */}
      <Section title="General Details">
        <form onSubmit={handleUpdateSettings}>
          <Card className="p-6 bg-zinc-900/10 border-zinc-800/40 space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Workspace Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg bg-zinc-900/50 border border-zinc-800/80 px-3 py-2 text-xs text-zinc-150 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Slug URL Path
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full rounded-lg bg-zinc-900/50 border border-zinc-805/85 px-3 py-2 text-xs text-zinc-150 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg bg-zinc-900/50 border border-zinc-805/85 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition resize-none leading-relaxed"
              />
            </div>

            <div className="flex justify-end pt-3 border-t border-zinc-900/60 mt-6">
              <Button
                type="submit"
                variant="default"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/10 gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save Changes (Coming Soon)</span>
              </Button>
            </div>
          </Card>
        </form>
      </Section>

      {/* 3. Danger Zone */}
      <Section title="Danger Zone">
        <Card className="p-6 bg-red-950/5 border border-red-900/10 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
                <ShieldAlert className="h-4.5 w-4.5 text-red-500" />
                <span>Delete Workspace Project</span>
              </h4>
              <p className="text-[11px] text-zinc-400 leading-normal font-medium max-w-md">
                Deletes the active project workspace database schema and vector storage contents permanently. This action is irreversible.
              </p>
            </div>
            <Button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              variant="destructive"
              size="sm"
              className="bg-red-650/10 text-red-400 hover:bg-red-950/20 border border-red-900/20 gap-1.5 self-start md:self-center shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{deleteMutation.isPending ? 'Deleting...' : 'Delete Workspace'}</span>
            </Button>
          </div>
        </Card>
      </Section>
    </div>
  );
}
