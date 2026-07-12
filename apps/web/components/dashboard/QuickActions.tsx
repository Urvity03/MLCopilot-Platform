'use client';

import * as React from 'react';
import { FolderPlus, Upload, MessageSquare } from 'lucide-react';
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
      title: 'New Project',
      description: 'Create a new project workspace to ingest papers.',
      icon: FolderPlus,
      onClick: onCreateProjectClick,
      disabled: false,
      color: 'text-emerald-400 group-hover:text-emerald-300 border-emerald-950/40 hover:border-emerald-500/20 bg-emerald-950/5',
    },
    {
      title: 'Upload Documents',
      description: 'Ingest raw PDF/DOCX files into active workspace.',
      icon: Upload,
      onClick: onNavigateToUploads,
      disabled: !hasProjects,
      color: 'text-cyan-400 group-hover:text-cyan-300 border-cyan-950/40 hover:border-cyan-500/20 bg-cyan-950/5',
    },
    {
      title: 'Start Chat',
      description: 'Query ingested corpus via semantic vector pipelines.',
      icon: MessageSquare,
      onClick: onNavigateToChat,
      disabled: !hasProjects,
      color: 'text-teal-400 group-hover:text-teal-300 border-teal-950/40 hover:border-teal-500/20 bg-teal-950/5',
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
                "p-4.5 flex gap-4 h-full items-start border-zinc-800/40 bg-zinc-900/10",
                !act.disabled && "group-hover:border-emerald-500/20"
              )}
            >
              <div 
                className={cn(
                  "p-2 rounded-lg border flex-shrink-0 transition-colors",
                  act.disabled 
                    ? "border-zinc-800 text-zinc-600 bg-zinc-900/30" 
                    : act.color
                )}
              >
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="space-y-0.5">
                <p className={cn(
                  "text-xs font-semibold transition-colors", 
                  act.disabled ? "text-zinc-500" : "text-zinc-200 group-hover:text-zinc-100"
                )}>
                  {act.title}
                </p>
                <p className="text-[11px] text-zinc-500 leading-normal font-medium">{act.description}</p>
              </div>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
