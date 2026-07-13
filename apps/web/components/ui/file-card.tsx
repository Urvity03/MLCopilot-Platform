'use client';

import * as React from 'react';
import { FileText, Database, Calendar, Eye, Trash2, Cpu } from 'lucide-react';
import { Card } from './card';
import { StatusPill } from './status-pill';
import { GradientBadge } from './gradient-badge';
import { Upload } from '../../types';

interface FileCardProps {
  upload: Upload;
  onViewDetails?: (upload: Upload) => void;
  onDeleteClick?: (uploadId: string) => void;
}

export function FileCard({
  upload,
  onViewDetails,
  onDeleteClick,
}: FileCardProps) {
  // Format file extension
  const extension = React.useMemo(() => {
    const parts = upload.filename.split('.');
    return parts.length > 1 ? parts.pop()?.toUpperCase() : 'DOC';
  }, [upload.filename]);

  const formattedDate = React.useMemo(() => {
    return new Date(upload.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [upload.created_at]);

  const chunkCount = upload.metadata?.chunk_count as number | undefined;

  return (
    <Card className="p-4 bg-zinc-900/10 border-zinc-800/40 hover:border-indigo-500/20 group flex flex-col justify-between h-40">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-indigo-400 group-hover:bg-indigo-950/20 group-hover:border-indigo-800/30 transition-all font-mono text-[9px] font-bold shrink-0">
              {extension}
            </div>
            <div className="min-w-0">
              <h4 
                className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate font-sans"
                title={upload.filename}
              >
                {upload.filename}
              </h4>
              <p className="text-[9px] text-zinc-500 font-medium tracking-wide uppercase mt-0.5">
                KIND: {upload.kind}
              </p>
            </div>
          </div>

          <StatusPill status={upload.embedding_status} />
        </div>

        {/* Aggregate chunks details if available */}
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          {chunkCount !== undefined ? (
            <GradientBadge variant="indigo" className="gap-1 flex items-center">
              <Database className="h-3 w-3 text-indigo-400" />
              <span>{chunkCount} CHUNKS</span>
            </GradientBadge>
          ) : (
            <GradientBadge variant="zinc">
              No chunks
            </GradientBadge>
          )}

          {upload.parse_status && (
            <GradientBadge variant="cyan" className="gap-1 flex items-center text-[9px]">
              <Cpu className="h-3 w-3 text-cyan-400" />
              <span className="uppercase">{upload.parse_status}</span>
            </GradientBadge>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-zinc-900/60 pt-3 mt-auto">
        <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-semibold font-mono">
          <Calendar className="h-3.5 w-3.5" />
          <span>{formattedDate}</span>
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(upload)}
              className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-450 hover:text-zinc-200 transition"
              title="View metadata summary"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          )}
          {onDeleteClick && (
            <button
              onClick={() => onDeleteClick(upload.id)}
              className="p-1 rounded bg-red-950/10 hover:bg-red-950/30 border border-red-900/10 text-red-400 transition"
              title="Delete asset"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
