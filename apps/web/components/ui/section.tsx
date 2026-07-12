'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export function Section({
  title,
  description,
  actions,
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <section
      className={cn("space-y-4 mb-8 last:mb-0", className)}
      {...props}
    >
      {(title || description || actions) && (
        <div className="flex items-center justify-between gap-4 border-b border-zinc-900/40 pb-3">
          <div className="space-y-0.5">
            {title && (
              <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs text-zinc-500 font-medium">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}
      <div className="w-full">{children}</div>
    </section>
  );
}
