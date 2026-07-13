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

  // Pipeline Status Mappings
  const isUploaded = true;
  const isParsed = upload.parse_status === 'parsed' || upload.embedding_status === 'embedded';
  const isChunked = chunkCount !== undefined && chunkCount > 0;
  const isEmbedded = upload.embedding_status === 'embedded';
  const isFailed = upload.parse_status === 'failed' || upload.embedding_status === 'failed';

  const readiness = React.useMemo(() => {
    if (isFailed) return { text: 'Ingestion Failed', color: 'text-rose-400 bg-rose-950/20 border-rose-900/30' };
    if (isEmbedded) return { text: 'Search Ready', color: 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30 animate-none' };
    if (upload.embedding_status === 'embedding') return { text: 'Embedding Vectors', color: 'text-cyan-400 bg-cyan-950/20 border-cyan-900/30 animate-pulse' };
    return { text: 'Parsing Pipeline', color: 'text-amber-400 bg-amber-950/20 border-amber-900/30 animate-pulse' };
  }, [isFailed, isEmbedded, upload.embedding_status]);

  return (
    <Card className="p-4.5 bg-zinc-900/10 border-zinc-800/40 hover:border-indigo-500/20 group flex flex-col justify-between h-44 relative overflow-hidden font-sans">
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
                Size: {upload.metadata?.size_bytes ? `${(upload.metadata.size_bytes / 1024).toFixed(1)} KB` : 'Unknown size'}
              </p>
            </div>
          </div>

          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-bold tracking-wide uppercase border font-mono ${readiness.color}`}>
            {readiness.text}
          </span>
        </div>

        {/* Mini Ingestion Pipeline Dot Ticker */}
        <div className="mt-4 flex items-center justify-between px-1 relative">
          <div className="absolute left-1 right-1 top-1/2 -translate-y-1/2 h-px bg-zinc-900 z-0" />
          {[
            { label: 'Upload', active: isUploaded },
            { label: 'Parse', active: isParsed },
            { label: 'Chunk', active: isChunked },
            { label: 'Embed', active: isEmbedded },
            { label: 'Ready', active: isEmbedded }
          ].map((step, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1 z-10 relative bg-[#09090b] px-1">
              <span className={`h-2 w-2 rounded-full border transition-all ${
                isFailed && !step.active ? 'bg-zinc-900 border-zinc-850' :
                isFailed && step.active && idx === 3 ? 'bg-rose-500 border-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]' :
                step.active ? 'bg-indigo-500 border-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.3)]' :
                'bg-zinc-900 border-zinc-850'
              }`} />
              <span className={`text-[8px] font-mono tracking-tighter uppercase font-semibold ${
                step.active ? 'text-zinc-300 font-bold' : 'text-zinc-600'
              }`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Aggregated details */}
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
