'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProjects } from '../../../hooks/useProjects';
import { useUploads } from '../../../hooks/useUploads';
import { PageHeader } from '../../../components/ui/page-header';
import { Section } from '../../../components/ui/section';
import { Card } from '../../../components/ui/card';
import { Database, MessageSquare, ArrowRight, Settings, FileText } from 'lucide-react';
import { Skeleton } from '../../../components/ui/skeletons';

export default function ProjectOverviewPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  
  const router = useRouter();
  const { projects, isLoading: projectsLoading } = useProjects();
  const { uploads, isLoading: uploadsLoading } = useUploads(projectId);

  const activeProject = React.useMemo(() => {
    return projects.find(p => p.id === projectId) || null;
  }, [projects, projectId]);

  if (projectsLoading) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-24 w-full rounded-xl bg-zinc-900/30" />
        <Skeleton className="h-48 w-full rounded-xl bg-zinc-900/30" />
      </div>
    );
  }

  if (!activeProject) {
    return (
      <div className="p-8 text-center text-zinc-500">
        Workspace details could not be found. Return to{' '}
        <button onClick={() => router.push('/dashboard')} className="text-emerald-400 font-semibold underline">
          dashboard
        </button>
      </div>
    );
  }

  const navigateTo = (route: 'uploads' | 'chat') => {
    router.push(`/projects/${projectId}/${route}`);
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* 1. Page Header */}
      <PageHeader
        title={`Workspace: ${activeProject.name}`}
        description={activeProject.description || 'No description provided for this project.'}
        actions={
          <button
            onClick={() => router.push(`/projects/${projectId}/settings`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 transition"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Workspace Settings</span>
          </button>
        }
      />

      {/* 2. Workspace Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Knowledge Base Card */}
        <button onClick={() => navigateTo('uploads')} className="text-left select-none group">
          <Card className="p-6 bg-zinc-900/10 border-zinc-800/40 hover:border-emerald-500/20 flex flex-col justify-between h-48">
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:text-emerald-450 group-hover:bg-emerald-950/20 group-hover:border-emerald-800/30 transition-all mb-4">
                <Database className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">
                Knowledge Base Repository
              </h3>
              <p className="text-xs text-zinc-450 mt-1.5 leading-normal">
                Upload text resources, extract sentence chunks, and embed vector indices.
              </p>
            </div>
            
            <div className="flex items-center justify-between mt-6 pt-3 border-t border-zinc-900/40">
              <span className="text-[10px] text-zinc-500 font-semibold font-mono">
                {uploadsLoading ? 'LOADING...' : `${uploads.length} DOCUMENTS`}
              </span>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>OPEN</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          </Card>
        </button>

        {/* AI Chat Card */}
        <button onClick={() => navigateTo('chat')} className="text-left select-none group">
          <Card className="p-6 bg-zinc-900/10 border-zinc-800/40 hover:border-emerald-500/20 flex flex-col justify-between h-48">
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:text-emerald-450 group-hover:bg-emerald-950/20 group-hover:border-emerald-800/30 transition-all mb-4">
                <MessageSquare className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">
                AI Copilot RAG Chat
              </h3>
              <p className="text-xs text-zinc-450 mt-1.5 leading-normal">
                Query papers, books, or notes using semantic vector search.
              </p>
            </div>

            <div className="flex items-center justify-between mt-6 pt-3 border-t border-zinc-900/40">
              <span className="text-[10px] text-zinc-500 font-semibold font-mono">
                RAG STREAMING ENABLED
              </span>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>OPEN</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          </Card>
        </button>
      </div>

      {/* Recent Activity */}
      <Section title="Workspace Details">
        <div className="p-5 rounded-xl border border-zinc-800/40 bg-zinc-900/10 space-y-4">
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-500 font-medium">Workspace Slug</span>
            <span className="font-semibold text-zinc-300 font-mono bg-zinc-950 px-2 py-0.5 border border-zinc-900 rounded">{activeProject.slug}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-500 font-medium">Creation Date</span>
            <span className="font-semibold text-zinc-350">{new Date(activeProject.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
          </div>
        </div>
      </Section>
    </div>
  );
}
