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
import { cn } from '@/lib/utils';
import { useApiKeys } from '../../../../hooks/useApiKeys';

export default function SettingsPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [slug, setSlug] = React.useState('');

  const [activeTab, setActiveTab] = React.useState<'general' | 'models' | 'api' | 'billing'>('general');
  const [generatedToken, setGeneratedToken] = React.useState<string | null>(null);
  const [copying, setCopying] = React.useState(false);

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

  const {
    apiKeys,
    createApiKey,
    deleteApiKey,
  } = useApiKeys();

  const handleGenerateToken = async () => {
    try {
      const resp = await createApiKey(`Workspace Key ${new Date().toLocaleDateString()}`);
      setGeneratedToken(resp.plain_key);
      toast.success('Generated new API workspace access token.');
    } catch (e) {
      toast.error('Failed to generate API workspace token.');
    }
  };

  const handleCopyToken = () => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken);
      setCopying(true);
      toast.success('Token copied to clipboard.');
      setTimeout(() => setCopying(false), 2000);
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

  const tabs = [
    { id: 'general', label: 'General Settings' },
    { id: 'models', label: 'Model Configuration' },
    { id: 'api', label: 'Developer API Keys' },
    { id: 'billing', label: 'Usage & Plans' }
  ] as const;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8 font-sans">
      {/* 1. Page Header */}
      <PageHeader
        title="Workspace Settings"
        description="Configure workspace properties, API slugs, metadata details, and project deletion."
      />

      {/* Tab Switcher */}
      <div className="flex border-b border-zinc-900/60 gap-4 select-none" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "pb-3 text-xs font-semibold border-b-2 transition-all relative cursor-pointer",
              activeTab === tab.id
                ? "border-indigo-500 text-zinc-100"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'general' && (
        <div className="space-y-8">
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
                    className="w-full rounded-lg bg-zinc-900/50 border border-zinc-800/80 px-3 py-2 text-xs text-zinc-200 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition outline-none"
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
                    className="w-full rounded-lg bg-zinc-900/50 border border-zinc-800/80 px-3 py-2 text-xs text-zinc-200 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition font-mono outline-none"
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
                    className="w-full rounded-lg bg-zinc-900/50 border border-zinc-800/80 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition resize-none leading-relaxed outline-none"
                  />
                </div>

                <div className="flex justify-end pt-3 border-t border-zinc-900/60 mt-6">
                  <Button
                    type="submit"
                    variant="default"
                    size="sm"
                    className="bg-primary hover:bg-primary/95 border border-indigo-500/20 shadow-md shadow-indigo-950/20 cursor-pointer active:translate-y-[0.5px] gap-1.5"
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
            <Card className="p-6 bg-red-955/5 border border-red-900/10 relative overflow-hidden">
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
                  className="bg-rose-955/20 text-rose-400 hover:bg-rose-955/40 border border-rose-900/20 gap-1.5 self-start md:self-center shrink-0 cursor-pointer active:translate-y-[0.5px]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{deleteMutation.isPending ? 'Deleting...' : 'Delete Workspace'}</span>
                </Button>
              </div>
            </Card>
          </Section>
        </div>
      )}

      {activeTab === 'models' && (
        <Section title="Vector Ingest models">
          <Card className="p-6 bg-zinc-900/10 border-zinc-800/40 space-y-6">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Active Embeddings Schema</span>
              <h4 className="text-xs font-bold text-zinc-200 mt-1">sentence-transformers/all-MiniLM-L6-v2 (Default)</h4>
              <p className="text-[11px] text-zinc-500 leading-relaxed font-medium mt-1">
                This schema separates document lines into overlapping blocks and maps vectors in 384 dimensions.
              </p>
            </div>

            <div className="h-px bg-zinc-900" />

            <div className="space-y-3">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Enterprise models Selector (Upgrade required)</span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 select-none">
                <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-lg flex flex-col justify-between min-h-[100px] opacity-60">
                  <div>
                    <h5 className="text-xs font-bold text-zinc-400 font-mono">text-embedding-3-small</h5>
                    <p className="text-[9px] text-zinc-550 mt-1">OpenAI high-density embedding (1536 dimensions).</p>
                  </div>
                  <span className="text-[8px] font-bold text-indigo-400/80 uppercase font-mono mt-3">🔒 Enterprise Plan Only</span>
                </div>

                <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-lg flex flex-col justify-between min-h-[100px] opacity-60">
                  <div>
                    <h5 className="text-xs font-bold text-zinc-400 font-mono">cohere-embed-english-v3</h5>
                    <p className="text-[9px] text-zinc-555 mt-1">Cohere English semantic retrieval model.</p>
                  </div>
                  <span className="text-[8px] font-bold text-indigo-400/80 uppercase font-mono mt-3">🔒 Upgrade Plan</span>
                </div>
              </div>
            </div>
          </Card>
        </Section>
      )}

      {activeTab === 'api' && (
        <Section title="Workspace API Access Keys">
          <Card className="p-6 bg-zinc-900/10 border-zinc-800/40 space-y-6">
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-zinc-200">Developer Authorization Tokens</h4>
              <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">
                Interact with the MLCopilot vector repository programmatically via API pipelines (Minio parsing / retrieval).
              </p>
            </div>

            <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl space-y-4">
              {generatedToken ? (
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Generated Authorization Token</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-indigo-400 font-mono p-2 bg-zinc-900 border border-zinc-850 rounded flex-1 select-all truncate">
                      {generatedToken}
                    </code>
                    <Button
                      onClick={handleCopyToken}
                      size="sm"
                      variant="outline"
                      className="border-zinc-800/85 hover:border-indigo-500/20 text-zinc-300 hover:text-white shrink-0 cursor-pointer"
                    >
                      {copying ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <p className="text-[9px] text-rose-400/80 font-mono font-medium">
                    ⚠️ Store this key safely. It will not be shown again.
                  </p>
                </div>
              ) : (
                <div className="text-center py-4 space-y-3 select-none">
                  <p className="text-[10px] text-zinc-550 font-medium">No active developer keys are loaded for this project workspace.</p>
                  <Button
                    onClick={handleGenerateToken}
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/20 text-white font-semibold shadow-md shadow-indigo-950/20 cursor-pointer active:translate-y-px"
                  >
                    Generate Developer Key
                  </Button>
                </div>
              )}
            </div>

            {/* List of active keys */}
            {apiKeys.length > 0 && (
              <div className="space-y-2 mt-4 select-none">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono block">Active Access Credentials</span>
                <div className="border border-zinc-900 bg-zinc-950/40 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-900 text-[8px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
                        <th className="p-3">Key Name</th>
                        <th className="p-3 font-mono">Prefix</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/40 text-zinc-300">
                      {apiKeys.map((key) => (
                        <tr key={key.id} className="hover:bg-zinc-900/5 transition-colors">
                          <td className="p-3 font-semibold">{key.name}</td>
                          <td className="p-3 font-mono">{key.prefix}••••••••</td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('Revoke this API Key immediately?')) {
                                  deleteApiKey(key.id);
                                }
                              }}
                              className="text-[10px] font-bold text-rose-400 hover:text-rose-350 cursor-pointer"
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>
        </Section>
      )}

      {activeTab === 'billing' && (
        <Section title="Vector limits & Storage Plan">
          <Card className="p-6 bg-zinc-900/10 border-zinc-800/40 space-y-6">
            <div className="space-y-4">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono block">Current Usage Analytics</span>
              
              <div className="space-y-2 select-none">
                <div className="flex justify-between text-[10px] font-semibold text-zinc-400">
                  <span>Document Storage Space</span>
                  <span>Free Tier Limit: 50 MB / 100 MB</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-950 rounded-full border border-zinc-900 overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: '50%' }} />
                </div>
              </div>

              <div className="space-y-2 select-none">
                <div className="flex justify-between text-[10px] font-semibold text-zinc-400">
                  <span>Vector Database Entries</span>
                  <span>1,240 / 5,000 Embeddings</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-950 rounded-full border border-zinc-900 overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: '24.8%' }} />
                </div>
              </div>
            </div>

            <div className="h-px bg-zinc-900" />

            <div className="p-4 rounded-xl border border-indigo-950 bg-indigo-955/5 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden select-none">
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-indigo-400">Need more database scope capacity?</h5>
                <p className="text-[10px] text-zinc-400 leading-normal font-medium max-w-sm">
                  Subscribe to the Team plan to get unlimited worker concurrent pipelines, 20GB of object storage space, and vector models metadata metrics custom logs.
                </p>
              </div>
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/20 text-white font-semibold shrink-0 self-start md:self-center cursor-pointer active:translate-y-px"
                onClick={() => toast.error('Billing checkout page coming soon in next patch!')}
              >
                Upgrade Plan
              </Button>
            </div>
          </Card>
        </Section>
      )}
    </div>
  );
}
