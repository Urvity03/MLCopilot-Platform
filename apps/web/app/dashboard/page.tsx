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
import { Cpu } from 'lucide-react';

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
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* 1. Workspace Header */}
      <WorkspaceHeader />

      {/* Active System Overview Summary Card */}
      {!isLoading && metrics && (
        <div className="p-5 rounded-2xl border border-[rgba(124,92,252,0.15)] bg-[#7C5CFC]/[0.02] relative overflow-hidden font-sans shadow-[0_0_20px_rgba(124,92,252,0.05)]">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Cpu className="h-20 w-20 text-[#7C5CFC]" />
          </div>
          <span className="text-[9px] font-bold text-[#7C5CFC] font-mono tracking-wider uppercase">
            Active System Overview
          </span>
          <p className="text-xs text-[#8B8D98] leading-relaxed font-medium mt-2 max-w-2xl">
            Core telemetry status: <span className="text-[#3DD68C] font-bold">OPERATIONAL</span>. 
            MLCopilot is running across <span className="text-[#F0F0F3] font-semibold">{metrics.totalProjects} workspaces</span>, 
            hosting <span className="text-[#F0F0F3] font-semibold">{metrics.totalDocuments} ingested documents</span> 
            split into <span className="text-[#F0F0F3] font-semibold">{metrics.totalChunks} parsed database blocks</span>. 
            A total of <span className="text-[#F0F0F3] font-semibold">{metrics.totalConversations} active RAG chat sessions</span> are running.
          </p>
        </div>
      )}

      {/* 2. KPI Cards Section */}
      <Section aria-label="Key Performance Indicators">
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl bg-[#111217] border border-[rgba(255,255,255,0.06)] animate-pulse" />
            ))}
          </div>
        ) : isError || !metrics ? (
          <div className="rounded-2xl border border-[#FF5C74]/20 bg-[#FF5C74]/5 p-4 text-xs font-semibold text-[#FF5C74]">
            Workspace summary metrics are temporarily unavailable.
          </div>
        ) : (
          <KPICards metrics={metrics} />
        )}
      </Section>

      {/* 3. Core Layout Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Side: Recent Workspaces & Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          <Section title="Active Workspaces">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl bg-[#111217] border border-[rgba(255,255,255,0.06)]" />
                ))}
              </div>
            ) : isError || !metrics ? (
              <div className="p-6 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#111217] text-center">
                <p className="text-xs text-[#8B8D98] font-semibold">Workspace list could not be loaded.</p>
              </div>
            ) : (
              <RecentProjects
                projects={metrics.projectsList}
                onCreateClick={handleCreateNewProject}
                onSelectTemplate={handleSelectTemplate}
              />
            )}
          </Section>

          <Section title="Quick Actions">
            <QuickActions
              onCreateProjectClick={handleCreateNewProject}
              onNavigateToUploads={handleNavigateToUploads}
              onNavigateToChat={handleNavigateToChat}
              hasProjects={hasProjects}
            />
          </Section>
        </div>

        {/* Right Side: Storage & Timeline Activity Feed */}
        <div className="space-y-6">
          {/* AI Platform Insights */}
          <Section title="AI Insights">
            {isLoading ? (
              <Skeleton className="h-44 rounded-2xl bg-[#111217] border border-[rgba(255,255,255,0.06)]" />
            ) : isError || !metrics ? (
              <div className="h-44 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#111217] flex items-center justify-center">
                <p className="text-xs text-[#8B8D98] font-semibold">Insights unavailable.</p>
              </div>
            ) : (
              <AIRecommendations metrics={metrics} />
            )}
          </Section>

          {/* Storage Analysis */}
          <Section title="Vector Indexes & Storage">
            {isLoading ? (
              <Skeleton className="h-48 rounded-2xl bg-[#111217] border border-[rgba(255,255,255,0.06)]" />
            ) : isError || !metrics ? (
              <div className="h-48 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#111217] flex items-center justify-center">
                <p className="text-xs text-[#8B8D98] font-semibold">Storage statistics unavailable.</p>
              </div>
            ) : (
              <StorageOverview stats={metrics.storageStats} />
            )}
          </Section>

          {/* Activity Timeline */}
          <Section title="Activity Logs">
            <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#111217] p-5 shadow-[0_0_15px_rgba(0,0,0,0.1)]">
              {isLoading ? (
                <div className="space-y-3.5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded-lg bg-[#181A20]" />
                  ))}
                </div>
              ) : isError || !metrics ? (
                <p className="text-xs text-[#8B8D98] font-semibold text-center py-4">Event feed log details unavailable.</p>
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
