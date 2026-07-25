'use client';

import * as React from 'react';
import { FileText, Database, Calendar, Eye, Trash2, Cpu } from 'lucide-react';
import { Card } from './card';
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
    if (isFailed) return { text: 'Failed', color: 'text-[#FF5C74] bg-[#FF5C74]/10 border-[#FF5C74]/15' };
    if (isEmbedded) return { text: 'Ready', color: 'text-[#3DD68C] bg-[#3DD68C]/10 border-[#3DD68C]/15' };
    if (upload.embedding_status === 'embedding') return { text: 'Embedding', color: 'text-[#4F8CFF] bg-[#4F8CFF]/10 border-[#4F8CFF]/15 animate-pulse' };
    return { text: 'Parsing', color: 'text-[#7C5CFC] bg-[#7C5CFC]/10 border-[#7C5CFC]/15 animate-pulse' };
  }, [isFailed, isEmbedded, upload.embedding_status]);

  return (
    <Card className="p-4.5 bg-[#111217] border border-[rgba(255,255,255,0.06)] hover:border-[#7C5CFC]/20 group flex flex-col justify-between h-44 relative overflow-hidden font-sans">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-[#181A20] border border-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#8B8D98] group-hover:text-[#7C5CFC] group-hover:bg-[#7C5CFC]/10 group-hover:border-[#7C5CFC]/10 transition-all font-mono text-[9px] font-bold shrink-0">
              {extension}
            </div>
            <div className="min-w-0">
              <h4 
                className="text-xs font-semibold text-[#F0F0F3] group-hover:text-white truncate font-sans"
                title={upload.filename}
              >
                {upload.filename}
              </h4>
              <p className="text-[9px] text-[#56585E] font-medium tracking-wide uppercase mt-0.5">
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
          <div className="absolute left-1 right-1 top-1/2 -translate-y-1/2 h-px bg-[#181A20] z-0" />
          {[
            { label: 'Upload', active: isUploaded },
            { label: 'Parse', active: isParsed },
            { label: 'Chunk', active: isChunked },
            { label: 'Embed', active: isEmbedded },
            { label: 'Ready', active: isEmbedded }
          ].map((step, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1 z-10 relative bg-[#111217] px-1 group-hover:bg-[#181A20] transition-colors duration-200">
              <span className={`h-2 w-2 rounded-full border transition-all ${
                isFailed && !step.active ? 'bg-[#181A20] border-[#181A20]' :
                isFailed && step.active && idx === 3 ? 'bg-[#FF5C74] border-[#FF5C74] shadow-[0_0_8px_rgba(255,92,116,0.3)]' :
                step.active ? 'bg-[#7C5CFC] border-[#7C5CFC] shadow-[0_0_8px_rgba(124,92,252,0.3)]' :
                'bg-[#181A20] border-[#181A20]'
              }`} />
              <span className={`text-[8px] font-mono tracking-tighter uppercase font-semibold ${
                step.active ? 'text-[#8B8D98] font-bold' : 'text-[#56585E]'
              }`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Aggregated details */}
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          {chunkCount !== undefined ? (
            <GradientBadge variant="purple" className="gap-1 flex items-center">
              <Database className="h-3 w-3 text-[#7C5CFC]" />
              <span>{chunkCount} CHUNKS</span>
            </GradientBadge>
          ) : (
            <GradientBadge variant="zinc">
              No chunks
            </GradientBadge>
          )}

          {upload.parse_status && (
            <GradientBadge variant="blue" className="gap-1 flex items-center text-[9px]">
              <Cpu className="h-3 w-3 text-[#4F8CFF]" />
              <span className="uppercase">{upload.parse_status}</span>
            </GradientBadge>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.06)] pt-3 mt-auto">
        <div className="flex items-center gap-1 text-[10px] text-[#56585E] font-semibold font-mono">
          <Calendar className="h-3.5 w-3.5" />
          <span>{formattedDate}</span>
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(upload)}
              className="p-1.5 rounded-lg bg-[#181A20] hover:bg-[#1E2028] border border-[rgba(255,255,255,0.06)] text-[#8B8D98] hover:text-[#F0F0F3] transition-all cursor-pointer"
              title="View metadata summary"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          )}
          {onDeleteClick && (
            <button
              onClick={() => onDeleteClick(upload.id)}
              className="p-1.5 rounded-lg bg-[#FF5C74]/10 hover:bg-[#FF5C74]/20 border border-[#FF5C74]/15 text-[#FF5C74] transition-all cursor-pointer"
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
