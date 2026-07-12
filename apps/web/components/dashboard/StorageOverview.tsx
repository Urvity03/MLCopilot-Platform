'use client';

import * as React from 'react';
import { HardDrive } from 'lucide-react';
import { Card } from '../ui/card';

interface StorageStats {
  documentsCount: number;
  chunksCount: number;
  embeddingsCount: number;
}

interface StorageOverviewProps {
  stats: StorageStats;
}

export function StorageOverview({ stats }: StorageOverviewProps) {
  return (
    <Card hoverGlow={false} className="flex flex-col justify-between h-full bg-zinc-900/10 border-zinc-800/40">
      <div>
        <div className="flex items-center gap-2 mb-4 text-zinc-300">
          <HardDrive className="h-4.5 w-4.5 text-emerald-400" />
          <h3 className="text-xs font-semibold tracking-tight">Workspace Storage Analysis</h3>
        </div>

        {/* Disk Space Allocation */}
        <div className="space-y-3">
          <div className="flex items-end justify-between font-mono text-[9px] text-zinc-500">
            <span>DISK SPACE ALLOCATED</span>
            <span className="font-semibold text-zinc-400">Coming Soon</span>
          </div>

          <div className="h-1.5 w-full rounded-full bg-zinc-900 overflow-hidden relative border border-zinc-900">
            <div className="h-full w-0 bg-zinc-800" />
          </div>
          <p className="text-[10px] text-zinc-500 font-medium italic">
            Object storage file size metrics will be integrated in a future sprint.
          </p>
        </div>
      </div>

      {/* Aggregate Counts */}
      <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-zinc-900/60 text-center font-sans">
        <div className="space-y-0.5">
          <p className="text-[9px] text-zinc-500 font-bold tracking-wider">DOCUMENTS</p>
          <p className="text-sm font-bold text-zinc-200 font-mono">
            {stats.documentsCount}
          </p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[9px] text-zinc-500 font-bold tracking-wider">CHUNKS</p>
          <p className="text-sm font-bold text-zinc-200 font-mono">
            {stats.chunksCount}
          </p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[9px] text-zinc-500 font-bold tracking-wider">EMBEDDINGS</p>
          <p className="text-sm font-bold text-zinc-200 font-mono">
            {stats.embeddingsCount}
          </p>
        </div>
      </div>
    </Card>
  );
}
