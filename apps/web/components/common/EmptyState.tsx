'use client';

import * as React from 'react';
import { LucideIcon, FolderOpen } from 'lucide-react';
import { Button } from '../ui/button';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState({
  title = 'No records found',
  description = 'There is currently no data in this section.',
  icon: Icon = FolderOpen,
  actionText,
  onAction,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex min-h-[350px] flex-col items-center justify-center rounded-xl border border-zinc-800/40 glass bg-zinc-950/20 p-8 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900/60 text-zinc-500 border border-zinc-800/50 mb-4 subtle-glow">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold text-zinc-200 mb-1">{title}</h3>
      <p className="max-w-xs text-xs text-zinc-400 font-medium leading-normal mb-6">{description}</p>
      {actionText && onAction && (
        <Button
          onClick={onAction}
          variant="default"
          size="sm"
          className="bg-primary hover:bg-primary/95 hover:shadow-lg hover:shadow-indigo-950/20 active:translate-y-px border border-indigo-500/10 font-semibold px-4 transition cursor-pointer"
        >
          {actionText}
        </Button>
      )}
    </motion.div>
  );
}
