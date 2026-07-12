'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface GradientBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'emerald' | 'cyan' | 'teal' | 'zinc';
}

export function GradientBadge({
  variant = 'emerald',
  className,
  children,
  ...props
}: GradientBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium border relative overflow-hidden font-mono",
        variant === 'emerald' && "bg-emerald-950/15 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.02)]",
        variant === 'cyan' && "bg-cyan-950/15 text-cyan-400 border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.02)]",
        variant === 'teal' && "bg-teal-950/15 text-teal-400 border-teal-500/20 shadow-[0_0_10px_rgba(20,184,166,0.02)]",
        variant === 'zinc' && "bg-zinc-900/60 text-zinc-400 border-zinc-800/80",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
