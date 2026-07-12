'use client';

import * as React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PageHeaderProps extends HTMLMotionProps<'div'> {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        "flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-zinc-900/60 mb-8",
        className
      )}
      {...props}
    >
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl font-sans">
          {title}
        </h1>
        {description && (
          <p className="text-xs text-zinc-400 font-medium max-w-xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3 shrink-0">
          {actions}
        </div>
      )}
    </motion.div>
  );
}
