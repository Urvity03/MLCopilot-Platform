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
            <stop offset="50%" stopColor="#7C5CFC" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
        </defs>
        {/* ML monogram — M with right leg extending into L baseline */}
        <path
          d={[
            // Outer contour (clockwise)
            'M 10 82',        // bottom-left of left leg
            'L 10 14',        // top of left leg
            'L 40 48',        // center valley (outer)
            'L 70 14',        // top of right leg
            'L 70 62',        // right leg goes down partway
            'L 92 62',        // L horizontal extends right
            'L 92 82',        // bottom of L extension
            'L 58 82',        // back left along bottom of L
            'L 58 30',        // right leg inner goes up
            'L 40 52',        // center valley (inner)
            'L 22 30',        // left leg inner goes up
            'L 22 82',        // left leg inner goes down
            'Z',              // close
          ].join(' ')}
          fill={`url(#${gradientId})`}
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
