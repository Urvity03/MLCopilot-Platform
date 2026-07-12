'use client';

import { Folder, Database, MessageSquare, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '../common/EmptyState';
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
      <EmptyState
        title="No project workspaces"
        description="Get started by creating a workspace to upload documents and query them."
        actionText="Create Project"
        onAction={onCreateClick}
      />
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
                <p className="text-xs text-zinc-450 font-medium leading-normal line-clamp-2 mt-1 mb-6">
                  {proj.description || 'No description provided.'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3.5 border-t border-zinc-900/60 mt-auto">
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-semibold font-mono">
                    <Database className="h-3.5 w-3.5 text-zinc-650" />
                    <span>{proj.documentCount} DOCS</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-semibold font-mono">
                    <MessageSquare className="h-3.5 w-3.5 text-zinc-650" />
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
