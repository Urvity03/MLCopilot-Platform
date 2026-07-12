'use client';

import * as React from 'react';
import { Card } from '../ui/card';
import { Sparkles, Activity, AlertCircle, ArrowUpRight } from 'lucide-react';

interface AIRecommendationsProps {
  metrics: {
    totalProjects: number;
    totalDocuments: number;
    totalChunks: number;
    totalEmbeddings: number;
  };
}

export function AIRecommendations({ metrics }: AIRecommendationsProps) {
  // Compute contextual recommendations
  const recommendation = React.useMemo(() => {
    if (metrics.totalProjects === 0) {
      return {
        tip: "Create your first project workspace to unlock vector index pipelines.",
        action: "Create Workspace",
      };
    }
    if (metrics.totalDocuments === 0) {
      return {
        tip: "Upload text books, research articles, or docs to generate embeddings.",
        action: "Upload Documents",
      };
    }
    if (metrics.totalChunks > 0 && metrics.totalEmbeddings === 0) {
      return {
        tip: "Your ingested chunks are awaiting RAG index embedding creation.",
        action: "Run Vectorization",
      };
    }
    return {
      tip: "Search index is fully queryable. Enter a project chat to semantically query documents.",
      action: "Start Chatting",
    };
  }, [metrics]);

  return (
    <Card className="p-5 bg-zinc-900/10 border-zinc-800/40 relative overflow-hidden font-sans">
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] select-none pointer-events-none">
        <Sparkles className="h-16 w-16 text-emerald-500" />
      </div>

      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-emerald-950/20 border border-emerald-900/25 flex items-center justify-center text-emerald-400 shrink-0">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-xs font-semibold text-zinc-200">AI Platform Insights</h4>
          <p className="text-[10px] text-zinc-550 font-medium">Copilot automated actions</p>
        </div>
      </div>

      <div className="mt-4 space-y-3.5">
        {/* Recommendation tip box */}
        <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-lg text-xs leading-relaxed text-zinc-350">
          <p className="font-semibold text-zinc-400 mb-1 select-none text-[9px] uppercase tracking-wider text-emerald-400">RECOMMENDED ACTION</p>
          <span className="font-medium">{recommendation.tip}</span>
        </div>

        {/* Pipeline Status indicators */}
        <div className="flex justify-between items-center text-[10px] pt-1">
          <span className="text-zinc-500 font-semibold uppercase tracking-wider">Pipeline Health</span>
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>OPERATIONAL</span>
          </div>
        </div>

        <div className="flex justify-between items-center text-[10px]">
          <span className="text-zinc-500 font-semibold uppercase tracking-wider">Embedding Model</span>
          <span className="font-bold text-zinc-400 font-mono">text-embedding-3-small</span>
        </div>
      </div>
    </Card>
  );
}
