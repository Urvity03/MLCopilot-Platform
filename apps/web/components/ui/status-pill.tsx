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
      case 'success':
      case 'active':
        return {
          bg: 'bg-[#3DD68C]/10 text-[#3DD68C] border-[#3DD68C]/15',
          dot: 'bg-[#3DD68C]',
          label: status === 'embedded' ? 'Ready' : status === 'success' ? 'Success' : 'Active',
        };
      case 'parsing':
      case 'embedding':
        return {
          bg: 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/15',
          dot: 'bg-[var(--primary)] animate-pulse',
          label: status === 'parsing' ? 'Parsing' : 'Embedding',
        };
      case 'pending':
        return {
          bg: 'bg-[#F5B83D]/10 text-[#F5B83D] border-[#F5B83D]/15',
          dot: 'bg-[#F5B83D]',
          label: 'Pending',
        };
      case 'failed':
      case 'inactive':
        return {
          bg: 'bg-[#FF5C74]/10 text-[#FF5C74] border-[#FF5C74]/15',
          dot: 'bg-[#FF5C74]',
          label: status === 'failed' ? 'Failed' : 'Inactive',
        };
      case 'parsed':
        return {
          bg: 'bg-[#4F8CFF]/10 text-[#4F8CFF] border-[#4F8CFF]/15',
          dot: 'bg-[#4F8CFF]',
          label: 'Parsed',
        };
      default:
        return {
          bg: 'bg-[#181A20] text-[#8B8D98] border-[rgba(255,255,255,0.06)]',
          dot: 'bg-[#56585E]',
          label: status,
        };
    }
  }, [status]);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[9px] font-semibold tracking-wide uppercase font-mono shrink-0 select-none",
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
