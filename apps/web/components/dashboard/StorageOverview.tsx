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
  // Compute simulated size matching document quantities (e.g. 1.5KB per chunk)
  const estimatedSizeKB = stats.chunksCount * 1.5;
  const estimatedSizeMB = (estimatedSizeKB / 1024).toFixed(2);
  const quotaLimitMB = 50;
  const utilizationPercentage = Math.min(100, Math.max(2, (parseFloat(estimatedSizeMB) / quotaLimitMB) * 100));

  return (
    <Card className="p-5 relative overflow-hidden">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-[#181A20] border border-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#8B8D98]">
          <HardDrive className="h-4 w-4 text-[var(--primary)]" />
        </div>
        <div>
          <h4 className="text-xs font-semibold text-[#F0F0F3]">Storage Quota Status</h4>
          <p className="text-[10px] text-[#56585E] font-medium">Vector index storage volume</p>
        </div>
      </div>

      {/* Progress Bar meter */}
      <div className="mt-5 space-y-2">
        <div className="flex justify-between text-[10px] font-semibold text-[#56585E] font-mono">
          <span>{estimatedSizeMB} MB USED</span>
          <span>{quotaLimitMB} MB LIMIT</span>
        </div>
        <div className="h-2 w-full bg-[#181A20] rounded-full overflow-hidden border border-[rgba(255,255,255,0.04)]">
          <div 
            className="h-full bg-[var(--primary)] rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(124,92,252,0.2)]" 
            style={{ width: `${utilizationPercentage}%` }} 
          />
        </div>
      </div>

      {/* Stats list details */}
      <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-[rgba(255,255,255,0.06)] text-center select-none">
        <div className="space-y-0.5">
          <p className="text-[9px] text-[#56585E] font-bold tracking-wider">DOCS</p>
          <p className="text-xs font-bold text-[#F0F0F3] font-mono">{stats.documentsCount}</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[9px] text-[#56585E] font-bold tracking-wider">CHUNKS</p>
          <p className="text-xs font-bold text-[#F0F0F3] font-mono">{stats.chunksCount}</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[9px] text-[#56585E] font-bold tracking-wider">EMBEDDINGS</p>
          <p className="text-xs font-bold text-[#F0F0F3] font-mono">{stats.embeddingsCount}</p>
        </div>
      </div>
    </Card>
  );
}
