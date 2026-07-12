'use client';

import * as React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from './card';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  description?: string;
  trend?: {
    value: string | number;
    label?: string;
    direction: 'up' | 'down' | 'neutral';
  };
  chartData?: number[];
  loading?: boolean;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  chartData,
  loading = false,
}: StatCardProps) {
  if (loading) {
    return (
      <Card hoverLift={false} hoverGlow={false} className="animate-shimmer h-32 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="h-4 bg-zinc-800/60 rounded w-1/3" />
          <div className="h-8 bg-zinc-800 rounded w-1/2" />
        </div>
        <div className="h-3 bg-zinc-800/60 rounded w-2/3" />
      </Card>
    );
  }

  // Generate SVG path for sparkline
  const sparklinePath = React.useMemo(() => {
    if (!chartData || chartData.length < 2) return '';
    const width = 120;
    const height = 30;
    const min = Math.min(...chartData);
    const max = Math.max(...chartData);
    const range = max - min === 0 ? 1 : max - min;
    
    return chartData
      .map((val, index) => {
        const x = (index / (chartData.length - 1)) * width;
        const y = height - ((val - min) / range) * height * 0.8 - height * 0.1; // leave 10% padding top/bottom
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [chartData]);

  return (
    <Card className="flex flex-col justify-between h-36">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            {title}
          </span>
          {Icon && (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900/80 text-zinc-400 border border-zinc-800/80">
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
        
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-white font-mono">
            {value}
          </span>
          {trend && (
            <div
              className={cn(
                "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium border",
                trend.direction === 'up' && "bg-emerald-950/20 text-emerald-400 border-emerald-900/30",
                trend.direction === 'down' && "bg-red-950/20 text-red-400 border-red-900/30",
                trend.direction === 'neutral' && "bg-zinc-900 text-zinc-400 border-zinc-800"
              )}
            >
              {trend.direction === 'up' && <TrendingUp className="h-3 w-3" />}
              {trend.direction === 'down' && <TrendingDown className="h-3 w-3" />}
              {trend.direction === 'neutral' && <Minus className="h-3 w-3" />}
              <span>{trend.value}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-auto">
        <span className="text-[11px] text-zinc-400 font-medium">
          {description || 'No description'}
        </span>
        {chartData && chartData.length >= 2 && (
          <div className="w-[120px] h-[30px] flex items-end">
            <svg width="120" height="30" className="overflow-visible">
              <path
                d={sparklinePath}
                fill="none"
                stroke={trend?.direction === 'down' ? '#ef4444' : '#10b981'}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>
    </Card>
  );
}
