'use client';

import * as React from 'react';
import { Card } from '../ui/card';
import { Sparkles } from 'lucide-react';

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
    <Card className="p-5 relative overflow-hidden">
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] select-none pointer-events-none">
        <Sparkles className="h-16 w-16 text-[#7C5CFC]" />
      </div>

      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-[#7C5CFC]/10 border border-[#7C5CFC]/10 flex items-center justify-center text-[#7C5CFC] shrink-0">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-xs font-semibold text-[#F0F0F3]">AI Platform Insights</h4>
          <p className="text-[10px] text-[#56585E] font-medium">Copilot automated actions</p>
        </div>
      </div>

      <div className="mt-4 space-y-3.5">
        {/* Recommendation tip box */}
        <div className="p-3 bg-[#181A20] border border-[rgba(255,255,255,0.04)] rounded-lg text-xs leading-relaxed text-[#8B8D98]">
          <p className="font-semibold text-[9px] uppercase tracking-wider text-[#7C5CFC] mb-1 select-none">RECOMMENDED ACTION</p>
          <span className="font-medium text-[#F0F0F3]/90">{recommendation.tip}</span>
        </div>

        {/* Pipeline Status indicators */}
        <div className="flex justify-between items-center text-[10px] pt-1">
          <span className="text-[#56585E] font-semibold uppercase tracking-wider">Pipeline Health</span>
          <div className="flex items-center gap-1.5 text-[#3DD68C] font-bold uppercase font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3DD68C] animate-pulse" />
            <span>OPERATIONAL</span>
          </div>
        </div>

        <div className="flex justify-between items-center text-[10px]">
          <span className="text-[#56585E] font-semibold uppercase tracking-wider">Embedding Model</span>
          <span className="font-bold text-[#8B8D98] font-mono">text-embedding-3-small</span>
        </div>
      </div>
    </Card>
  );
}
