'use client';

import { FolderPlus, Upload, MessageSquare, Key } from 'lucide-react';

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
      title: 'New Workspace',
      description: 'Create a project',
      icon: FolderPlus,
      onClick: onCreateProjectClick,
      disabled: false,
      shortcut: 'N',
    },
    {
      title: 'Upload Documents',
      description: 'Ingest files',
      icon: Upload,
      onClick: onNavigateToUploads,
      disabled: !hasProjects,
      shortcut: 'U',
    },
    {
      title: 'AI Chat',
      description: 'RAG conversation',
      icon: MessageSquare,
      onClick: onNavigateToChat,
      disabled: !hasProjects,
      shortcut: 'C',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {actions.map((act, idx) => {
        const Icon = act.icon;
        return (
          <button
            key={idx}
            onClick={act.onClick}
            disabled={act.disabled}
            className={`group flex items-center gap-3 p-4 rounded-xl bg-[#111217] border border-[rgba(255,255,255,0.06)] transition-all duration-200 text-left cursor-pointer
              ${act.disabled 
                ? 'opacity-40 cursor-not-allowed' 
                : 'hover:border-[rgba(124,92,252,0.12)] hover:bg-[#181A20] active:scale-[0.98]'
              }`}
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0 transition-colors
              ${act.disabled ? 'bg-[#181A20] text-[#56585E]' : 'bg-[var(--primary)]/10 text-[var(--primary)]'}`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-[#F0F0F3] truncate">
                {act.title}
              </p>
              <p className="text-[10px] text-[#56585E]">{act.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
