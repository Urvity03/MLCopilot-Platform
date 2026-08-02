'use client';

import * as React from 'react';
import { useAuthStore } from '../../store/auth';
import { Sparkles } from 'lucide-react';

export function WorkspaceHeader() {
  const { user } = useAuthStore();
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--primary)]/10">
          <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" />
        </div>
        <span className="text-[11px] font-medium text-[var(--primary)] uppercase tracking-wider">
          Enterprise Workspace
        </span>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">
        <span className="text-[#8B8D98]">{getGreeting()}, </span>
        <span className="text-gradient-hero">{user?.full_name?.split(' ')[0] || 'there'}</span>
      </h1>
      <p className="text-sm text-[#56585E] font-medium">
        Here&apos;s your workspace overview and AI operations status.
      </p>
    </div>
  );
}
