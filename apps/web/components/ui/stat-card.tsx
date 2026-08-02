'use client';

import * as React from 'react';
import { LucideIcon } from 'lucide-react';
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
  accentColor?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  chartData,
  loading = false,
  accentColor = 'var(--primary)',
}: StatCardProps) {
  if (loading) {
    return (
      <div className="rounded-2xl bg-[#111217] border border-[rgba(255,255,255,0.06)] p-5 h-[140px] flex flex-col justify-between relative overflow-hidden">
        <div className="space-y-2.5">
          <div className="h-3 bg-[#181A20] rounded-lg w-2/5 animate-pulse" />
          <div className="h-7 bg-[#181A20] rounded-lg w-1/3 animate-pulse" />
        </div>
        <div className="h-2.5 bg-[#181A20] rounded-lg w-3/5 animate-pulse" />
        {/* Shimmer overlay */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.02] to-transparent" />
      </div>
    );
  }

  // Generate SVG sparkline
  const sparklinePath = React.useMemo(() => {
    if (!chartData || chartData.length < 2) return '';
    const width = 80;
    const height = 24;
    const min = Math.min(...chartData);
    const max = Math.max(...chartData);
    const range = max - min === 0 ? 1 : max - min;
    
    return chartData
      .map((val, index) => {
        const x = (index / (chartData.length - 1)) * width;
        const y = height - ((val - min) / range) * height * 0.8 - height * 0.1;
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [chartData]);

  // Area fill path
  const areaPath = React.useMemo(() => {
    if (!sparklinePath || !chartData || chartData.length < 2) return '';
    return `${sparklinePath} L 80 24 L 0 24 Z`;
  }, [sparklinePath, chartData]);

  return (
    <div className="group rounded-2xl bg-[#111217] border border-[rgba(255,255,255,0.06)] p-5 h-[140px] flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:border-[var(--primary)]/20 hover:shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
      {/* Subtle top accent line */}
      <div 
        className="absolute top-0 left-0 right-0 h-[1px] opacity-40 group-hover:opacity-70 transition-opacity"
        style={{ background: `linear-gradient(90deg, transparent, var(--primary), transparent)` }}
      />
      
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-[#56585E] uppercase tracking-wider">
            {title}
          </span>
          {Icon && (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#181A20] text-[#56585E] group-hover:text-[var(--primary)] transition-colors">
              <Icon className="h-3.5 w-3.5" />
            </div>
          )}
        </div>
        
        <div className="mt-2 flex items-baseline gap-3">
          <span className="text-2xl font-bold tracking-tight text-[#F0F0F3]">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#56585E] font-medium">
          {description || ''}
        </span>
        {chartData && chartData.length >= 2 && (
          <div className="w-[80px] h-[24px]">
            <svg width="80" height="24" className="overflow-visible">
              <defs>
                <linearGradient id={`area-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accentColor} stopOpacity="0.15" />
                  <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d={areaPath}
                fill={`url(#area-${title.replace(/\s/g, '')})`}
              />
              <path
                d={sparklinePath}
                fill="none"
                stroke={accentColor}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-60 group-hover:opacity-100 transition-opacity"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
