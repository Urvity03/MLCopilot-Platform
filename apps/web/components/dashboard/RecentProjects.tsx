'use client';

import { Folder, FileText, MessageSquare, ArrowRight, Plus, Database, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Project } from '../../types';
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
        name: 'Research Corpus',
        slug: 'research-corpus',
        description: 'Index academic papers and research articles for semantic exploration.',
        icon: Database,
      },
      {
        name: 'Legal Analysis',
        slug: 'legal-contract-audit',
        description: 'Parse contracts and compliance documents for intelligent clause search.',
        icon: FileText,
      },
      {
        name: 'Knowledge Hub',
        slug: 'knowledge-hub',
        description: 'Build an internal knowledge base from company documentation.',
        icon: Sparkles,
      },
    ];

    return (
      <div className="rounded-2xl bg-[#111217] border border-[rgba(255,255,255,0.06)] p-6 space-y-5">
        {/* Onboarding guide */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-[#F0F0F3]">
            Create your first workspace
          </h3>
          <p className="text-[12px] text-[#8B8D98] leading-relaxed max-w-lg">
            A workspace is your AI knowledge container. Upload documents, generate embeddings, 
            and start asking questions with RAG-powered conversations.
          </p>
        </div>

        {/* Workflow steps */}
        <div className="flex items-center gap-2 text-[10px] font-medium text-[#56585E]">
          {['Create Workspace', 'Upload Docs', 'Generate Embeddings', 'Start Chatting'].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-[9px] font-bold">
                  {i + 1}
                </span>
                <span className="whitespace-nowrap">{step}</span>
              </div>
              {i < 3 && <ArrowRight className="h-3 w-3 text-[#56585E]/50" />}
            </div>
          ))}
        </div>

        {/* Templates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {templates.map((tpl, idx) => {
            const TplIcon = tpl.icon;
            return (
              <button
                key={idx}
                onClick={() => onSelectTemplate({ name: tpl.name, slug: tpl.slug, description: tpl.description })}
                className="group w-full text-left rounded-xl bg-[#181A20] border border-[rgba(255,255,255,0.06)] p-4 transition-all duration-200 hover:border-[var(--primary)]/20 hover:bg-[#1E2028] cursor-pointer active:scale-[0.98]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] mb-3">
                  <TplIcon className="h-4 w-4" />
                </div>
                <h4 className="text-[12px] font-semibold text-[#F0F0F3] group-hover:text-white transition-colors">
                  {tpl.name}
                </h4>
                <p className="text-[11px] text-[#56585E] leading-relaxed mt-1 line-clamp-2">
                  {tpl.description}
                </p>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-[rgba(255,255,255,0.06)]">
          <span className="text-[11px] text-[#56585E]">Or start with a blank workspace</span>
          <button
            onClick={onCreateClick}
            className="rounded-xl bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white text-[12px] font-medium px-4 py-2 transition-all active:scale-[0.97] cursor-pointer shadow-lg shadow-[var(--primary)]/20"
          >
            <div className="flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              New Workspace
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.05 } },
      }}
      className="space-y-2"
    >
      {projects.map((proj) => (
        <motion.div
          key={proj.id}
          variants={{
            hidden: { opacity: 0, y: 8 },
            show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
          }}
        >
          <Link
            href={`/projects/${proj.id}`}
            className="group flex items-center gap-4 p-4 rounded-xl bg-[#111217] border border-[rgba(255,255,255,0.06)] transition-all duration-200 hover:border-[var(--primary)]/20 hover:bg-[#181A20]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#181A20] text-[#56585E] group-hover:text-[var(--primary)] group-hover:bg-[var(--primary)]/10 transition-all flex-shrink-0">
              <Folder className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-[#F0F0F3] group-hover:text-white transition-colors truncate">
                {proj.name}
              </h3>
              <p className="text-[11px] text-[#56585E] truncate mt-0.5">
                {proj.description || 'No description'}
              </p>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="flex items-center gap-1.5 text-[11px] text-[#56585E]">
                <FileText className="h-3.5 w-3.5" />
                <span>{proj.documentCount}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#56585E]">
                <MessageSquare className="h-3.5 w-3.5" />
                <span>{proj.conversationCount}</span>
              </div>
              <ArrowRight className="h-4 w-4 text-[#56585E] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </div>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
