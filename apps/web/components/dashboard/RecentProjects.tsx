'use client';

import { Folder, Database, MessageSquare, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Project } from '../../types';
import { Card } from '../ui/card';
import { motion } from 'framer-motion';

interface RecentProjectsProps {
  projects: Array<Project & { documentCount: number; conversationCount: number }>;
  onCreateClick: () => void;
}

export function RecentProjects({ projects, onCreateClick }: RecentProjectsProps) {
  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-900/60 bg-zinc-950/20 p-6 space-y-6 relative overflow-hidden font-sans">
        <div className="absolute top-0 right-0 p-6 opacity-5 select-none pointer-events-none">
          <Sparkles className="h-24 w-24 text-emerald-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <span>🚀 Welcome to MLCopilot</span>
          </h3>
          <p className="text-[11px] text-zinc-450 leading-relaxed font-medium mt-1">
            Let's build your first AI semantic index and start querying your custom corpus.
          </p>
        </div>

        {/* Onboarding Checklist */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 rounded-full bg-emerald-950 border border-emerald-500/20 flex items-center justify-center text-[10px] text-emerald-400 font-bold font-mono">✓</div>
            <span className="text-xs text-zinc-400 font-semibold line-through">Step 1: Create MLCopilot Platform Account</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] text-zinc-200 font-bold font-mono">2</div>
            <span className="text-xs text-zinc-200 font-semibold">Step 2: Initialize a Project Workspace</span>
          </div>
          <div className="flex items-center gap-3 opacity-40">
            <div className="h-5 w-5 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] text-zinc-550 font-bold font-mono">3</div>
            <span className="text-xs text-zinc-450 font-medium">Step 3: Upload research documents & papers</span>
          </div>
          <div className="flex items-center gap-3 opacity-40">
            <div className="h-5 w-5 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] text-zinc-550 font-bold font-mono">4</div>
            <span className="text-xs text-zinc-450 font-medium">Step 4: Start semantic RAG copilot chat</span>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-zinc-900/60">
          <button
            onClick={onCreateClick}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white px-4 py-2 transition border border-emerald-500/10 shadow-md shadow-emerald-950/10 cursor-pointer active:scale-95"
          >
            Create Project Workspace
          </button>
        </div>
      </div>
    );
  }

  const containerVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.98 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: 'easeOut' as const } },
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      {projects.map((proj) => (
        <motion.div key={proj.id} variants={itemVariants}>
          <Link
            href={`/projects/${proj.id}`}
            className="group flex flex-col h-full"
          >
            <Card
              className="p-5 flex flex-col justify-between h-full bg-zinc-900/10 border-zinc-800/40 group-hover:border-emerald-500/20"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:text-emerald-450 group-hover:bg-emerald-950/20 group-hover:border-emerald-800/30 transition-all shadow-[0_0_15px_rgba(0,0,0,0.2)]">
                    <Folder className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[9px] font-mono font-medium text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-900">
                    {new Date(proj.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <h3 className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">
                  {proj.name}
                </h3>
                <p className="text-xs text-zinc-400 font-medium leading-normal line-clamp-2 mt-1 mb-6">
                  {proj.description || 'No description provided.'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3.5 border-t border-zinc-900/60 mt-auto">
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-semibold font-mono">
                    <Database className="h-3.5 w-3.5 text-zinc-600" />
                    <span>{proj.documentCount} DOCS</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-semibold font-mono">
                    <MessageSquare className="h-3.5 w-3.5 text-zinc-600" />
                    <span>{proj.conversationCount} CHATS</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>ENTER</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </Card>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
