'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export type StatusType = 
  | 'pending'
  | 'parsing'
  | 'parsed'
  | 'embedding'
  | 'embedded'
  | 'failed'
  | 'success'
  | 'active'
  | 'inactive';

interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusType;
}

export function StatusPill({ status, className, ...props }: StatusPillProps) {
  const config = React.useMemo(() => {
    switch (status) {
      case 'embedded':
        return {
          bg: 'bg-indigo-950/20 text-indigo-400 border-indigo-900/30',
          dot: 'bg-indigo-400',
          label: 'Embedded',
        };
      case 'success':
      case 'active':
        return {
          bg: 'bg-emerald-950/20 text-emerald-400 border-emerald-900/30',
          dot: 'bg-emerald-400',
          label: status === 'success' ? 'Success' : 'Active',
        };
      case 'parsing':
      case 'embedding':
        return {
          bg: 'bg-cyan-950/20 text-cyan-400 border-cyan-900/30',
          dot: 'bg-cyan-400 animate-pulse',
          label: status === 'parsing' ? 'Parsing' : 'Embedding',
        };
      case 'pending':
        return {
          bg: 'bg-amber-950/15 text-amber-400 border-amber-900/20',
          dot: 'bg-amber-400',
          label: 'Pending',
        };
      case 'failed':
      case 'inactive':
        return {
          bg: 'bg-rose-950/20 text-rose-400 border-rose-900/30',
          dot: 'bg-rose-500',
          label: status === 'failed' ? 'Failed' : 'Inactive',
        };
      case 'parsed':
        return {
          bg: 'bg-violet-950/20 text-violet-400 border-violet-900/30',
          dot: 'bg-violet-400',
          label: 'Parsed',
        };
      default:
        return {
          bg: 'bg-zinc-900 text-zinc-400 border-zinc-850',
          dot: 'bg-zinc-500',
          label: status,
        };
    }
  }, [status]);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase font-sans shrink-0",
        config.bg,
        className
      )}
      {...props}
    >
      <span className={cn("h-1 w-1 rounded-full", config.dot)} />
      <span>{config.label}</span>
    </span>
  );
}
