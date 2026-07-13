'use client';

import { Folder, Database, MessageSquare, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Project } from '../../types';
import { Card } from '../ui/card';
import { motion } from 'framer-motion';

interface RecentProjectsProps {
  projects: Array<Project & { documentCount: number; conversationCount: number }>;
  onCreateClick: () => void;
  onSelectTemplate: (template: { name: string; slug: string; description: string }) => void;
}

export function RecentProjects({ projects, onCreateClick, onSelectTemplate }: RecentProjectsProps) {
  if (projects.length === 0) {
    const templates = [
      {
        name: 'BioMedical Corpus Search',
        slug: 'biomedical-corpus',
        description: 'Ingest PMC research articles and clinical guidelines to explore medical semantic vectors.',
        icon: Database,
        color: 'text-indigo-400 border-indigo-950/40 bg-indigo-950/5 hover:border-indigo-500/30'
      },
      {
        name: 'SEC Filings Analyzer',
        slug: 'sec-filings-analysis',
        description: 'Aggregate public company balance sheets and financial logs to index RAG context.',
        icon: Sparkles,
        color: 'text-cyan-400 border-cyan-950/40 bg-cyan-950/5 hover:border-cyan-500/30'
      },
      {
        name: 'Legal Document Auditor',
        slug: 'legal-contract-audit',
        description: 'Inspect service level agreements and corporate compliance contracts for semantic search.',
        icon: Folder,
        color: 'text-violet-400 border-violet-955/40 bg-violet-955/5 hover:border-violet-500/30'
      }
    ];

    return (
      <div className="rounded-xl border border-zinc-900/60 bg-zinc-950/20 p-6 space-y-6 relative overflow-hidden font-sans">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-indigo-500/20 bg-indigo-950/15 text-[9px] font-bold text-indigo-400 font-mono tracking-wider uppercase">
            Active Onboarding Setup
          </span>
          <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2 mt-2">
            Initialize an AI Workspace Blueprint
          </h3>
          <p className="text-[11px] text-zinc-450 leading-relaxed font-medium mt-1">
            To query document models, you must first create a search workspace context. Choose a pre-configured template partition below or start from scratch.
          </p>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {templates.map((tpl, idx) => {
            const TplIcon = tpl.icon;
            return (
              <button
                key={idx}
                onClick={() => onSelectTemplate({ name: tpl.name, slug: tpl.slug, description: tpl.description })}
                className="w-full text-left rounded-lg transition-all duration-300 relative select-none group border border-zinc-800/40 bg-zinc-900/10 p-4 hover:border-zinc-700/80 cursor-pointer active:translate-y-px flex flex-col justify-between min-h-[140px]"
              >
                <div>
                  <div className={`p-2 w-fit rounded-lg border flex-shrink-0 mb-3 transition-colors ${tpl.color}`}>
                    <TplIcon className="h-4 w-4" />
                  </div>
                  <h4 className="text-[11px] font-bold text-zinc-200 group-hover:text-white transition-colors">{tpl.name}</h4>
                  <p className="text-[9px] text-zinc-500 leading-normal font-medium mt-1.5 line-clamp-3">
                    {tpl.description}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[9px] font-bold text-indigo-400 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>DEPLOY BLUEPRINT</span>
                  <ArrowRight className="h-2.5 w-2.5" />
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-zinc-900/60 text-[10px] text-zinc-500 font-medium">
          <span>Need custom properties? Setup custom databases.</span>
          <button
            onClick={onCreateClick}
            className="rounded-lg bg-primary hover:bg-primary/95 text-[10px] font-semibold text-white px-3.5 py-1.5 transition border border-indigo-500/20 shadow-md shadow-indigo-950/20 cursor-pointer active:translate-y-[0.5px]"
          >
            Create Empty Workspace
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
              className="p-5 flex flex-col justify-between h-full bg-zinc-900/10 border-zinc-800/40 group-hover:border-indigo-500/20"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:text-indigo-400 group-hover:bg-indigo-950/20 group-hover:border-indigo-800/30 transition-all shadow-[0_0_15px_rgba(0,0,0,0.2)]">
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
                <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
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
