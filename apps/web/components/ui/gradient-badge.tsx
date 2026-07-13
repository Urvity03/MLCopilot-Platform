'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface GradientBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'indigo' | 'violet' | 'cyan' | 'zinc';
}

export function GradientBadge({
  variant = 'indigo',
  className,
  children,
  ...props
}: GradientBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium border relative overflow-hidden font-mono",
        variant === 'indigo' && "bg-indigo-950/15 text-indigo-400 border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.02)]",
        variant === 'violet' && "bg-violet-950/15 text-violet-400 border-violet-500/20 shadow-[0_0_10px_rgba(139,92,246,0.02)]",
        variant === 'cyan' && "bg-cyan-950/15 text-cyan-400 border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.02)]",
        variant === 'zinc' && "bg-zinc-900/60 text-zinc-400 border-zinc-800/80",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
