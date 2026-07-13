'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useDashboardMetrics } from '../../hooks/useDashboardMetrics';
import { WorkspaceHeader } from '../../components/dashboard/WorkspaceHeader';
import { KPICards } from '../../components/dashboard/KPICards';
import { RecentProjects } from '../../components/dashboard/RecentProjects';
import { RecentEvents } from '../../components/dashboard/RecentEvents';
import { QuickActions } from '../../components/dashboard/QuickActions';
import { StorageOverview } from '../../components/dashboard/StorageOverview';
import { NewProjectModal } from '../../components/dashboard/NewProjectModal';
import { AIRecommendations } from '../../components/dashboard/AIRecommendations';
import { Section } from '../../components/ui/section';
import { Skeleton } from '../../components/ui/skeletons';
import { Cpu, Lock } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { data: metrics, isLoading, isError } = useDashboardMetrics();
  const [newProjectOpen, setNewProjectOpen] = React.useState(false);
  const [prefilledData, setPrefilledData] = React.useState<{ name: string; slug: string; description: string } | null>(null);

  const hasProjects = React.useMemo(() => {
    return !!metrics && metrics.projectsList.length > 0;
  }, [metrics]);

  const firstProjectId = React.useMemo(() => {
    return hasProjects ? metrics!.projectsList[0].id : '';
  }, [hasProjects, metrics]);

  const handleNavigateToUploads = () => {
    if (firstProjectId) {
      router.push(`/projects/${firstProjectId}/uploads`);
    }
  };

  const handleNavigateToChat = () => {
    if (firstProjectId) {
      router.push(`/projects/${firstProjectId}/chat`);
    }
  };

  const handleSelectTemplate = (template: { name: string; slug: string; description: string }) => {
    setPrefilledData(template);
    setNewProjectOpen(true);
  };

  const handleCreateNewProject = () => {
    setPrefilledData(null);
    setNewProjectOpen(true);
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* 1. Workspace Header */}
      <WorkspaceHeader />

      {/* Executive Overview Summary Card */}
      {!isLoading && metrics && (
        <div className="p-5 rounded-xl border border-indigo-950/40 bg-indigo-950/5 relative overflow-hidden font-sans">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Cpu className="h-20 w-20 text-indigo-500" />
          </div>
          <span className="text-[9px] font-bold text-indigo-400 font-mono tracking-wider uppercase">
            Active System Overview
          </span>
          <p className="text-xs text-zinc-350 leading-relaxed font-medium mt-2 max-w-2xl">
            Core telemetry status: <span className="text-emerald-450 font-bold">OPERATIONAL</span>. 
            MLCopilot is running across <span className="text-white font-semibold">{metrics.totalProjects} workspaces</span>, 
            hosting <span className="text-white font-semibold">{metrics.totalDocuments} ingested documents</span> 
            split into <span className="text-white font-semibold">{metrics.totalChunks} parsed database blocks</span>. 
            A total of <span className="text-white font-semibold">{metrics.totalConversations} active RAG chat sessions</span> are running.
          </p>
        </div>
      )}

      {/* 2. KPI Cards Section */}
      <Section aria-label="Key Performance Indicators">
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl bg-zinc-900/30 border border-zinc-800/20" />
            ))}
          </div>
        ) : isError || !metrics ? (
          <div className="rounded-xl border border-red-900/20 bg-red-950/10 p-4 text-xs font-semibold text-red-400">
            Workspace summary metrics are temporarily unavailable.
          </div>
        ) : (
          <KPICards metrics={metrics} />
        )}
      </Section>

      {/* Real-time Telemetry (Enterprise Placeholders) */}
      <Section title="Real-Time Telemetry & Systems Status">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Query Latency Telemetry */}
          <div className="p-5 bg-zinc-900/10 border border-zinc-800/40 rounded-xl relative overflow-hidden flex flex-col justify-between min-h-[140px] font-sans">
            <div className="absolute top-3 right-3 text-zinc-700">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-zinc-550 font-mono tracking-wider uppercase">Query Retrieval Latency</span>
              <h4 className="text-lg font-bold text-zinc-600 mt-2 font-mono">-- ms</h4>
              <p className="text-[10px] text-zinc-500 font-medium leading-relaxed mt-1">
                Monitor index lookup speeds and generation load curves.
              </p>
            </div>
            <div className="text-[9px] font-bold text-indigo-400/80 uppercase font-mono mt-3 select-none">
              🔒 ENTERPRISE PROFILE REQUIRED
            </div>
          </div>

          {/* Background Worker Queues */}
          <div className="p-5 bg-zinc-900/10 border border-zinc-800/40 rounded-xl relative overflow-hidden flex flex-col justify-between min-h-[140px] font-sans">
            <div className="absolute top-3 right-3 text-zinc-700">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-zinc-550 font-mono tracking-wider uppercase">Background Index Queue</span>
              <h4 className="text-lg font-bold text-zinc-600 mt-2 font-mono">IDLE</h4>
              <p className="text-[10px] text-zinc-550 font-medium leading-relaxed mt-1">
                Active vector partitioning workers and ingestion pools.
              </p>
            </div>
            <div className="text-[9px] font-bold text-indigo-400/80 uppercase font-mono mt-3 select-none">
              🔒 COMING SOON IN V1.2
            </div>
          </div>

          {/* pgvector Cache Hit Rate */}
          <div className="p-5 bg-zinc-900/10 border border-zinc-800/40 rounded-xl relative overflow-hidden flex flex-col justify-between min-h-[140px] font-sans">
            <div className="absolute top-3 right-3 text-zinc-700">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-zinc-550 font-mono tracking-wider uppercase">vector Cache Hit Ratio</span>
              <h4 className="text-lg font-bold text-zinc-600 mt-2 font-mono">-- %</h4>
              <p className="text-[10px] text-zinc-550 font-medium leading-relaxed mt-1">
                Analyze database index caches and pgvector query hits.
              </p>
            </div>
            <div className="text-[9px] font-bold text-indigo-400/80 uppercase font-mono mt-3 select-none">
              🔒 ENTERPRISE METRICS ONLY
            </div>
          </div>
        </div>
      </Section>

      {/* 3. Quick Actions */}
      <Section title="Quick Actions">
        <QuickActions
          onCreateProjectClick={handleCreateNewProject}
          onNavigateToUploads={handleNavigateToUploads}
          onNavigateToChat={handleNavigateToChat}
          hasProjects={hasProjects}
        />
      </Section>

      {/* 4. Core Layout Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Side: Recent Projects list (takes 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Section title="Recent Workspaces">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-44 rounded-xl bg-zinc-900/30 border border-zinc-800/20" />
                ))}
              </div>
            ) : isError || !metrics ? (
              <div className="p-6 rounded-xl border border-zinc-900 bg-zinc-950/20 text-center">
                <p className="text-xs text-zinc-500 font-semibold">Workspace list could not be loaded.</p>
              </div>
            ) : (
              <RecentProjects
                projects={metrics.projectsList}
                onCreateClick={handleCreateNewProject}
                onSelectTemplate={handleSelectTemplate}
              />
            )}
          </Section>
        </div>

        {/* Right Side: Storage & Timeline Activity Feed (takes 1 col) */}
        <div className="space-y-6">
          {/* AI Platform Insights */}
          <Section title="AI Platform Insights">
            {isLoading ? (
              <Skeleton className="h-44 rounded-xl bg-zinc-900/30 border border-zinc-800/20" />
            ) : isError || !metrics ? (
              <div className="h-44 rounded-xl border border-zinc-900 bg-zinc-950/20 flex items-center justify-center">
                <p className="text-xs text-zinc-500 font-semibold">Insights unavailable.</p>
              </div>
            ) : (
              <AIRecommendations metrics={metrics} />
            )}
          </Section>

          {/* Storage Analysis */}
          <Section title="Storage Analysis">
            {isLoading ? (
              <Skeleton className="h-48 rounded-xl bg-zinc-900/30 border border-zinc-800/20" />
            ) : isError || !metrics ? (
              <div className="h-48 rounded-xl border border-zinc-900 bg-zinc-950/20 flex items-center justify-center">
                <p className="text-xs text-zinc-500 font-semibold">Storage statistics unavailable.</p>
              </div>
            ) : (
              <StorageOverview stats={metrics.storageStats} />
            )}
          </Section>

          {/* Activity Timeline */}
          <Section title="Activity Logs">
            <div className="rounded-xl border border-zinc-800/30 bg-zinc-900/10 p-5 shadow-[0_0_15px_rgba(0,0,0,0.1)]">
              {isLoading ? (
                <div className="space-y-3.5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded-lg bg-zinc-900/30" />
                  ))}
                </div>
              ) : isError || !metrics ? (
                <p className="text-xs text-zinc-500 font-semibold text-center py-4">Event feed log details unavailable.</p>
              ) : (
                <RecentEvents events={metrics.recentActivity} />
              )}
            </div>
          </Section>
        </div>
      </div>

      {/* New Project Dialog Modal */}
      <NewProjectModal isOpen={newProjectOpen} onClose={() => setNewProjectOpen(false)} prefilledData={prefilledData} />
    </div>
  );
}
