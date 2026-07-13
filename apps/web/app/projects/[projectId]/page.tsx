'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProjects } from '../../../hooks/useProjects';
import { useUploads } from '../../../hooks/useUploads';
import { PageHeader } from '../../../components/ui/page-header';
import { Section } from '../../../components/ui/section';
import { Card } from '../../../components/ui/card';
import { StatCard } from '../../../components/ui/stat-card';
import { Database, MessageSquare, ArrowRight, Settings, FileText, Cpu, Calendar, Code } from 'lucide-react';
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

  const stats = React.useMemo(() => {
    if (uploadsLoading || !uploads) {
      return { docs: 0, chunks: 0, embedded: 0 };
    }
    const docs = uploads.length;
    // Calculate simulated chunks/embeddings from metadata if available, otherwise mock-scale
    const chunks = uploads.reduce((acc, u) => acc + (u.metadata?.chunks_count || 12), 0);
    const embedded = uploads.filter(u => u.embedding_status === 'embedded').length;
    return { docs, chunks, embedded };
  }, [uploads, uploadsLoading]);

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
      <div className="p-8 text-center text-zinc-500 font-sans">
        Workspace details could not be found. Return to{' '}
        <button onClick={() => router.push('/dashboard')} className="text-indigo-400 font-semibold underline cursor-pointer">
          dashboard
        </button>
      </div>
    );
  }

  const navigateTo = (route: 'uploads' | 'chat') => {
    router.push(`/projects/${projectId}/${route}`);
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 font-sans">
      {/* 1. Page Header */}
      <PageHeader
        title={`Workspace: ${activeProject.name}`}
        description={activeProject.description || 'No description provided for this project.'}
        actions={
          <button
            onClick={() => router.push(`/projects/${projectId}/settings`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Workspace Settings</span>
          </button>
        }
      />

      {/* 2. Workspace Analytics Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 select-none">
        <StatCard
          title="Ingested Docs"
          value={stats.docs}
          icon={Database}
          description="Total uploaded documents"
          trend={{ value: 'Active', direction: 'up' }}
          chartData={[stats.docs * 0.2, stats.docs * 0.6, stats.docs]}
        />
        <StatCard
          title="Parsed Chunks"
          value={stats.chunks}
          icon={FileText}
          description="Vector split text blocks"
          trend={{ value: 'Healthy', direction: 'up' }}
          chartData={[stats.chunks * 0.3, stats.chunks * 0.8, stats.chunks]}
        />
        <StatCard
          title="Indexed Embeddings"
          value={stats.embedded}
          icon={Cpu}
          description="Vector indices in PostgreSQL"
          trend={{ value: `${stats.docs > 0 ? ((stats.embedded / stats.docs) * 100).toFixed(0) : 0}% Done`, direction: 'up' }}
        />
      </div>

      {/* 3. Action Gateways Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Knowledge Base Card */}
        <button onClick={() => navigateTo('uploads')} className="text-left select-none group cursor-pointer">
          <Card className="p-6 bg-zinc-900/10 border-zinc-800/40 hover:border-indigo-500/20 flex flex-col justify-between h-48">
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:text-indigo-400 group-hover:bg-indigo-950/20 group-hover:border-indigo-800/30 transition-all mb-4">
                <Database className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">
                Knowledge Base Repository
              </h3>
              <p className="text-xs text-zinc-400 mt-1.5 leading-normal font-medium">
                Upload text resources, extract sentence chunks, and embed vector indices.
              </p>
            </div>
            
            <div className="flex items-center justify-between mt-6 pt-3 border-t border-zinc-900/40">
              <span className="text-[10px] text-zinc-500 font-semibold font-mono">
                {uploadsLoading ? 'LOADING...' : `${uploads.length} DOCUMENTS`}
              </span>
              <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>OPEN</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          </Card>
        </button>

        {/* AI Chat Card */}
        <button onClick={() => navigateTo('chat')} className="text-left select-none group cursor-pointer">
          <Card className="p-6 bg-zinc-900/10 border-zinc-800/40 hover:border-indigo-500/20 flex flex-col justify-between h-48">
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:text-indigo-400 group-hover:bg-indigo-950/20 group-hover:border-indigo-800/30 transition-all mb-4">
                <MessageSquare className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">
                AI Copilot RAG Chat
              </h3>
              <p className="text-xs text-zinc-400 mt-1.5 leading-normal font-medium">
                Query papers, books, or notes using semantic vector search.
              </p>
            </div>

            <div className="flex items-center justify-between mt-6 pt-3 border-t border-zinc-900/40">
              <span className="text-[10px] text-zinc-500 font-semibold font-mono">
                RAG STREAMING ENABLED
              </span>
              <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>OPEN</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          </Card>
        </button>
      </div>

      {/* 4. Details / Metadata Grid */}
      <Section title="Workspace Details">
        <Card className="p-5 bg-zinc-900/10 border-zinc-800/40 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-450">
              <Code className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider">Workspace Path Handle</p>
              <p className="text-xs font-semibold text-zinc-300 font-mono mt-0.5 select-all">{activeProject.slug}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-450">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider">Created On</p>
              <p className="text-xs font-semibold text-zinc-300 mt-0.5">
                {new Date(activeProject.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
              </p>
            </div>
          </div>
        </Card>
      </Section>
    </div>
  );
}
