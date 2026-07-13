'use client';

import { FolderPlus, Upload, MessageSquare, ArrowRight } from 'lucide-react';
import { Card } from '../ui/card';
import { cn } from '@/lib/utils';

interface QuickActionsProps {
  onCreateProjectClick: () => void;
  onNavigateToUploads: () => void;
  onNavigateToChat: () => void;
  hasProjects: boolean;
}

export function QuickActions({
  onCreateProjectClick,
  onNavigateToUploads,
  onNavigateToChat,
  hasProjects,
}: QuickActionsProps) {
  const actions = [
    {
      title: 'Initialize Workspace',
      description: 'Create a new project workspace schema to begin ingesting files.',
      icon: FolderPlus,
      onClick: onCreateProjectClick,
      disabled: false,
      color: 'text-indigo-400 group-hover:text-indigo-350 border-indigo-950/40 bg-indigo-950/5',
    },
    {
      title: 'Ingest Text Corpus',
      description: 'Upload and parse PDFs, markdown, or text files into embeddings.',
      icon: Upload,
      onClick: onNavigateToUploads,
      disabled: !hasProjects,
      color: 'text-cyan-400 group-hover:text-cyan-350 border-cyan-950/40 bg-cyan-950/5',
    },
    {
      title: 'AI Copilot Chat',
      description: 'Interact with your workspace vectors using RAG streaming queries.',
      icon: MessageSquare,
      onClick: onNavigateToChat,
      disabled: !hasProjects,
      color: 'text-violet-400 group-hover:text-violet-350 border-violet-950/40 bg-violet-950/5',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {actions.map((act, idx) => {
        const Icon = act.icon;
        return (
          <button
            key={idx}
            onClick={act.onClick}
            disabled={act.disabled}
            className={cn(
              "w-full text-left rounded-xl transition-all duration-300 relative select-none group",
              act.disabled
                ? "opacity-40 cursor-not-allowed"
                : "cursor-pointer"
            )}
          >
            <Card 
              hoverLift={!act.disabled} 
              hoverGlow={!act.disabled}
              className={cn(
                "p-5 flex gap-4 h-full items-start border-zinc-800/40 bg-zinc-900/10 relative overflow-hidden transition-all duration-350",
                !act.disabled && "group-hover:border-indigo-500/25 group-hover:bg-zinc-900/20 group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
              )}
            >
              <div 
                className={cn(
                  "p-2.5 rounded-lg border flex-shrink-0 transition-colors",
                  act.disabled 
                    ? "border-zinc-800 text-zinc-650 bg-zinc-900/30" 
                    : act.color
                )}
              >
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-1.5">
                  <p className={cn(
                    "text-xs font-bold transition-colors", 
                    act.disabled ? "text-zinc-500" : "text-zinc-200 group-hover:text-white"
                  )}>
                    {act.title}
                  </p>
                  {!act.disabled && (
                    <ArrowRight className="h-3 w-3 text-indigo-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-zinc-500 leading-normal font-medium">{act.description}</p>
              </div>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
