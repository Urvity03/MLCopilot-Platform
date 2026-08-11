'use client';

import * as React from 'react';

interface MLCopilotLogoProps {
  size?: number | string;
  className?: string;
  showText?: boolean;
  textClassName?: string;
  subtextClassName?: string;
  showSubtext?: boolean;
}

export function MLCopilotLogo({
  size = 32,
  className = '',
  showText = false,
  textClassName = 'text-base font-semibold text-[var(--foreground)] tracking-tight',
  subtextClassName = 'text-xs text-[var(--muted-foreground)] mt-0.5',
  showSubtext = false,
}: MLCopilotLogoProps) {
  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <img
        src="/mlcopilot-favicon-v3.png"
        width={typeof size === 'number' ? size : 32}
        height={typeof size === 'number' ? size : 32}
        style={{ width: size, height: size }}
        alt="MLCopilot Logo"
        className="shrink-0 object-contain transition-transform duration-200"
      />
      {showText && (
        <div className="flex flex-col min-w-0">
          <span className={textClassName}>MLCopilot</span>
          {showSubtext && (
            <span className={subtextClassName}>AI Knowledge Operating System</span>
          )}
        </div>
      )}
    </div>
  );
}
