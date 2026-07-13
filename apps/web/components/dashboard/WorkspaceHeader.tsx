'use client';

import * as React from 'react';
import { useAuthStore } from '../../store/auth';
import { PageHeader } from '../ui/page-header';
import { Calendar } from 'lucide-react';

export function WorkspaceHeader() {
  const { user } = useAuthStore();
  
  const formattedDate = React.useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  return (
    <PageHeader
      title={`Welcome back, ${user?.full_name || 'Developer'}`}
      description="Here is what's happening across your MLCopilot projects."
      actions={
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-[11px] font-semibold text-zinc-400 font-mono">
          <Calendar className="h-3.5 w-3.5 text-indigo-400" />
          <span>{formattedDate}</span>
        </div>
      }
    />
  );
}
