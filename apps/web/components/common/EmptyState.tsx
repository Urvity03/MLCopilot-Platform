'use client';

import * as React from 'react';
import { LucideIcon, FolderOpen, ArrowRight } from 'lucide-react';
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
      className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#111217] p-8 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#181A20] text-[#56585E] border border-[rgba(255,255,255,0.06)] mb-4">
        <Icon className="h-5 w-5 text-[#7C5CFC]" />
      </div>
      <h3 className="text-sm font-semibold text-[#F0F0F3] mb-1.5">{title}</h3>
      <p className="max-w-xs text-xs text-[#8B8D98] leading-relaxed mb-6">{description}</p>
      
      {/* Onboarding Workflow Guide */}
      <div className="flex items-center gap-2 text-[9px] font-semibold text-[#56585E] mb-6 border-t border-[rgba(255,255,255,0.04)] pt-6 w-full max-w-sm justify-center">
        {['Workspace', 'Upload', 'Embed', 'Chat'].map((step, i) => (
          <div key={step} className="flex items-center gap-1.5">
            <div className="flex items-center gap-1">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-[8px] font-bold">
                {i + 1}
              </span>
              <span className="uppercase tracking-wider">{step}</span>
            </div>
            {i < 3 && <ArrowRight className="h-2.5 w-2.5 opacity-40" />}
          </div>
        ))}
      </div>

      {actionText && onAction && (
        <Button
          onClick={onAction}
          variant="default"
          size="sm"
          className="bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white border border-[var(--primary)]/10 active:scale-[0.97] transition-all cursor-pointer font-medium px-4 rounded-xl"
        >
          {actionText}
        </Button>
      )}
    </motion.div>
  );
}
