'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface GradientBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'purple' | 'blue' | 'green' | 'zinc';
}

export function GradientBadge({
  variant = 'purple',
  className,
  children,
  ...props
}: GradientBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-2 py-0.5 text-[9px] font-semibold border relative overflow-hidden font-mono tracking-wide uppercase select-none",
        variant === 'purple' && "bg-[#7C5CFC]/10 text-[#7C5CFC] border-[#7C5CFC]/15",
        variant === 'blue' && "bg-[#4F8CFF]/10 text-[#4F8CFF] border-[#4F8CFF]/15",
        variant === 'green' && "bg-[#3DD68C]/10 text-[#3DD68C] border-[#3DD68C]/15",
        variant === 'zinc' && "bg-[#181A20] text-[#8B8D98] border-[rgba(255,255,255,0.06)]",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
