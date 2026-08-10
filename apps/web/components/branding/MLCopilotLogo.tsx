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
  const logoId = React.useId();
  const gradientId = `ml-logo-grad-${logoId.replace(/:/g, '')}`;

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-200"
        aria-label="MLCopilot Logo"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A855F7" />
            <stop offset="45%" stopColor="#7C5CFC" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
        </defs>
        <path
          d="M 22 78 V 26 L 47 53 L 64 26 V 62 C 64 71 71 78 80 78 H 92"
          stroke={`url(#${gradientId})`}
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
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
