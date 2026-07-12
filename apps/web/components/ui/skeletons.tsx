'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-shimmer rounded bg-zinc-800/40 relative overflow-hidden", className)}
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/10 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-6 w-2/3" />
      <div className="space-y-2 pt-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center justify-between py-4 border-b border-zinc-900/60 last:border-0">
      <div className="flex items-center gap-3 w-2/3">
        <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
        <div className="space-y-2 w-full">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-6 w-16 rounded" />
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonRow key={idx} />
      ))}
    </div>
  );
}
