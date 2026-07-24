'use client';

import { cn } from '@/lib/utils';

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2.5',
    lg: 'h-12 w-12 border-3',
  };

  return (
    <div className="flex items-center justify-center">
      <div
        className={cn(sizeClasses[size], "animate-spin rounded-full border-[#7C5CFC] border-t-transparent")}
      />
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090B] animate-fade-in">
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-xs font-semibold text-[#8B8D98] tracking-wider uppercase font-mono animate-pulse-soft">Loading MLCopilot...</p>
      </div>
    </div>
  );
}
