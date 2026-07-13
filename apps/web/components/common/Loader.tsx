'use client';

import { motion } from 'framer-motion';

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div className="flex items-center justify-center">
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-primary border-t-transparent`}
      />
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090b]">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-sm font-medium text-zinc-400">Loading MLCopilot...</p>
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-sm">
      <div className="flex animate-pulse space-x-4">
        <div className="flex-1 space-y-4 py-1">
          <div className="h-4 w-1/4 rounded bg-zinc-800" />
          <div className="space-y-2">
            <div className="h-4 rounded bg-zinc-800" />
            <div className="h-4 w-5/6 rounded bg-zinc-800" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
