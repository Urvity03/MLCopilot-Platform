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

export default function DashboardPage() {
  const router = useRouter();
  const { data: metrics, isLoading, isError } = useDashboardMetrics();
  const [newProjectOpen, setNewProjectOpen] = React.useState(false);

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

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* 1. Workspace Header */}
      <WorkspaceHeader />

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

      {/* 3. Quick Actions */}
      <Section title="Quick Actions">
        <QuickActions
          onCreateProjectClick={() => setNewProjectOpen(true)}
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
                onCreateClick={() => setNewProjectOpen(true)}
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
      <NewProjectModal isOpen={newProjectOpen} onClose={() => setNewProjectOpen(false)} />
    </div>
  );
}
