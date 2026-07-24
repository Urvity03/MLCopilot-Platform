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
import { Settings, Trash2, ShieldAlert, Save, Key, Sliders, Database, CreditCard } from 'lucide-react';
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
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6 animate-pulse">
        <Skeleton className="h-24 w-full rounded-2xl bg-[#111217] border border-[rgba(255,255,255,0.06)]" />
        <Skeleton className="h-48 w-full rounded-2xl bg-[#111217] border border-[rgba(255,255,255,0.06)]" />
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'models', label: 'Models', icon: Sliders },
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'billing', label: 'Billing', icon: CreditCard }
  ] as const;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8 font-sans animate-fade-in">
      {/* 1. Page Header */}
      <PageHeader
        title="Workspace Settings"
        description="Configure workspace properties, API slugs, metadata details, and project deletion."
        icon={Settings}
      />

      {/* Tab Switcher */}
      <div className="flex border-b border-[rgba(255,255,255,0.06)] gap-4 select-none" role="tablist">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "pb-3 text-xs font-semibold border-b-2 transition-all relative cursor-pointer flex items-center gap-1.5",
                activeTab === tab.id
                  ? "border-[#7C5CFC] text-[#F0F0F3]"
                  : "border-transparent text-[#56585E] hover:text-[#8B8D98]"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      {activeTab === 'general' && (
        <div className="space-y-8 animate-fade-in-up">
          {/* 2. Update Form */}
          <Section title="General Details">
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
                    Slug URL Path
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
                  />
                </div>

                <div className="flex justify-end pt-3 border-t border-[rgba(255,255,255,0.06)] mt-6">
                  <Button
                    type="submit"
                    variant="default"
                    size="sm"
                    className="bg-[#181A20] border border-[rgba(255,255,255,0.06)] hover:border-[#7C5CFC]/25 text-[#8B8D98] hover:text-[#F0F0F3] active:scale-[0.97] transition-all cursor-pointer gap-1.5"
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
            <Card className="p-6 bg-[#FF5C74]/5 border border-[#FF5C74]/15 relative overflow-hidden rounded-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-[#FF5C74] flex items-center gap-1.5">
                    <ShieldAlert className="h-4.5 w-4.5 text-[#FF5C74]" />
                    <span>Delete Workspace Project</span>
                  </h4>
                  <p className="text-[11px] text-[#8B8D98] leading-normal font-medium max-w-md">
                    Deletes the active project workspace database schema and vector storage contents permanently. This action is irreversible.
                  </p>
                </div>
                <Button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  variant="destructive"
                  size="sm"
                  className="bg-[#FF5C74]/10 text-[#FF5C74] hover:bg-[#FF5C74]/20 border border-[#FF5C74]/15 gap-1.5 self-start md:self-center shrink-0 cursor-pointer active:scale-[0.97] transition-all"
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
        <Section title="Vector Ingestion Models" className="animate-fade-in-up">
          <Card className="p-6 bg-[#111217] border border-[rgba(255,255,255,0.06)] space-y-6">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-[#56585E] uppercase tracking-wider font-mono">Active Embeddings Schema</span>
              <h4 className="text-xs font-bold text-[#F0F0F3] mt-1">sentence-transformers/all-MiniLM-L6-v2 (Default)</h4>
              <p className="text-[11px] text-[#8B8D98] leading-relaxed font-medium mt-1">
                This schema separates document lines into overlapping blocks and maps vectors in 384 dimensions.
              </p>
            </div>

            <div className="h-px bg-[rgba(255,255,255,0.06)]" />

            <div className="space-y-3">
              <span className="text-[9px] font-bold text-[#56585E] uppercase tracking-wider font-mono block">Enterprise Models (Upgrade Required)</span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 select-none">
                <div className="p-4 bg-[#181A20] border border-[rgba(255,255,255,0.06)] rounded-xl flex flex-col justify-between min-h-[100px] opacity-60">
                  <div>
                    <h5 className="text-xs font-bold text-[#8B8D98] font-mono">text-embedding-3-small</h5>
                    <p className="text-[9px] text-[#56585E] mt-1">OpenAI high-density embedding (1536 dimensions).</p>
                  </div>
                  <span className="text-[8px] font-bold text-[#7C5CFC] uppercase font-mono mt-3">🔒 Enterprise Plan Only</span>
                </div>

                <div className="p-4 bg-[#181A20] border border-[rgba(255,255,255,0.06)] rounded-xl flex flex-col justify-between min-h-[100px] opacity-60">
                  <div>
                    <h5 className="text-xs font-bold text-[#8B8D98] font-mono">cohere-embed-english-v3</h5>
                    <p className="text-[9px] text-[#56585E] mt-1">Cohere English semantic retrieval model.</p>
                  </div>
                  <span className="text-[8px] font-bold text-[#7C5CFC] uppercase font-mono mt-3">🔒 Upgrade Plan</span>
                </div>
              </div>
            </div>
          </Card>
        </Section>
      )}

      {activeTab === 'api' && (
        <Section title="Workspace API Access Keys" className="animate-fade-in-up">
          <Card className="p-6 bg-[#111217] border border-[rgba(255,255,255,0.06)] space-y-6">
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-[#F0F0F3]">Developer Authorization Tokens</h4>
              <p className="text-[11px] text-[#8B8D98] leading-relaxed font-medium">
                Interact with the MLCopilot vector repository programmatically via API pipelines (Minio parsing / retrieval).
              </p>
            </div>

            <div className="p-4 bg-[#181A20] border border-[rgba(255,255,255,0.06)] rounded-xl space-y-4">
              {generatedToken ? (
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-[#56585E] uppercase tracking-wider block">Generated Authorization Token</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-[#7C5CFC] font-mono p-2 bg-[#111217] border border-[rgba(255,255,255,0.06)] rounded-xl flex-1 select-all truncate">
                      {generatedToken}
                    </code>
                    <Button
                      onClick={handleCopyToken}
                      size="sm"
                      variant="outline"
                      className="border-[rgba(255,255,255,0.06)] hover:border-[#7C5CFC]/20 text-[#8B8D98] hover:text-[#F0F0F3] shrink-0 cursor-pointer transition-all rounded-xl"
                    >
                      {copying ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <p className="text-[9px] text-[#FF5C74] font-mono font-medium">
                    ⚠️ Store this key safely. It will not be shown again.
                  </p>
                </div>
              ) : (
                <div className="text-center py-4 space-y-3 select-none">
                  <p className="text-[10px] text-[#8B8D98] font-medium">No active developer keys are loaded for this project workspace.</p>
                  <Button
                    onClick={handleGenerateToken}
                    size="sm"
                    className="bg-[#7C5CFC] hover:bg-[#6B4FE0] border border-[#7C5CFC]/10 text-white font-semibold shadow-md active:scale-[0.97] transition-all cursor-pointer rounded-xl"
                  >
                    Generate Developer Key
                  </Button>
                </div>
              )}
            </div>

            {/* List of active keys */}
            {apiKeys.length > 0 && (
              <div className="space-y-2 mt-4 select-none">
                <span className="text-[9px] font-bold text-[#56585E] uppercase tracking-wider font-mono block font-semibold">Active Access Credentials</span>
                <div className="border border-[rgba(255,255,255,0.06)] bg-[#181A20]/40 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[rgba(255,255,255,0.06)] text-[8px] font-bold text-[#56585E] uppercase tracking-wider font-mono bg-[#181A20]/50">
                        <th className="p-3">Key Name</th>
                        <th className="p-3 font-mono">Prefix</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(255,255,255,0.04)] text-[#8B8D98]">
                      {apiKeys.map((key) => (
                        <tr key={key.id} className="hover:bg-[#181A20]/30 transition-colors">
                          <td className="p-3 font-semibold text-[#F0F0F3]">{key.name}</td>
                          <td className="p-3 font-mono">{key.prefix}••••••••</td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('Revoke this API Key immediately?')) {
                                  deleteApiKey(key.id);
                                }
                              }}
                              className="text-[10px] font-bold text-[#FF5C74] hover:text-[#FF5C74]/80 cursor-pointer transition-colors"
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
        <Section title="Vector Limits & Storage Plan" className="animate-fade-in-up">
          <Card className="p-6 bg-[#111217] border border-[rgba(255,255,255,0.06)] space-y-6">
            <div className="space-y-4">
              <span className="text-[9px] font-bold text-[#56585E] uppercase tracking-wider font-mono block">Current Usage Analytics</span>
              
              <div className="space-y-2 select-none">
                <div className="flex justify-between text-[10px] font-semibold text-[#8B8D98]">
                  <span>Document Storage Space</span>
                  <span>Free Tier Limit: 50 MB / 100 MB</span>
                </div>
                <div className="h-1.5 w-full bg-[#181A20] rounded-full border border-[rgba(255,255,255,0.04)] overflow-hidden">
                  <div className="h-full bg-[#7C5CFC] rounded-full" style={{ width: '50%' }} />
                </div>
              </div>

              <div className="space-y-2 select-none">
                <div className="flex justify-between text-[10px] font-semibold text-[#8B8D98]">
                  <span>Vector Database Entries</span>
                  <span>1,240 / 5,000 Embeddings</span>
                </div>
                <div className="h-1.5 w-full bg-[#181A20] rounded-full border border-[rgba(255,255,255,0.04)] overflow-hidden">
                  <div className="h-full bg-[#7C5CFC] rounded-full" style={{ width: '24.8%' }} />
                </div>
              </div>
            </div>

            <div className="h-px bg-[rgba(255,255,255,0.06)]" />

            <div className="p-4 rounded-xl border border-[#7C5CFC]/15 bg-[#7C5CFC]/5 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden select-none">
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-[#7C5CFC]">Need more database scope capacity?</h5>
                <p className="text-[10px] text-[#8B8D98] leading-normal font-medium max-w-sm">
                  Subscribe to the Team plan to get unlimited worker concurrent pipelines, 20GB of object storage space, and vector models metadata metrics custom logs.
                </p>
              </div>
              <Button
                size="sm"
                className="bg-[#7C5CFC] hover:bg-[#6B4FE0] border border-[#7C5CFC]/10 text-white font-semibold shrink-0 self-start md:self-center cursor-pointer active:scale-[0.97] transition-all rounded-xl"
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
