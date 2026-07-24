'use client';

import { ShieldAlert, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ErrorViewProps {
  title?: string;
  message?: string;
  code?: number | string;
  onRetry?: () => void;
  showBackButton?: boolean;
}

export function ErrorView({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while processing your request.',
  code = '500',
  onRetry,
  showBackButton = true,
}: ErrorViewProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FF5C74]/10 text-[#FF5C74] border border-[#FF5C74]/15 mb-6">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <span className="text-[10px] font-mono font-bold tracking-wider text-[#FF5C74] uppercase mb-2">
        Error Code {code}
      </span>
      <h1 className="text-xl font-semibold tracking-tight text-[#F0F0F3] mb-2">{title}</h1>
      <p className="max-w-md text-xs text-[#8B8D98] leading-relaxed mb-8">{message}</p>
      
      <div className="flex flex-col gap-3 sm:flex-row select-none">
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#181A20] border border-[rgba(255,255,255,0.06)] px-5 py-2.5 text-xs font-semibold text-[#F0F0F3] hover:bg-[#1E2028] transition-all cursor-pointer active:scale-[0.97]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry Request
          </button>
        )}
        {showBackButton && (
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#7C5CFC] hover:bg-[#6B4FE0] px-5 py-2.5 text-xs font-semibold text-white transition-all cursor-pointer active:scale-[0.97]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </Link>
        )}
      </div>
    </div>
  );
}

export function ErrorPage({ code = '500', title, message }: { code?: string; title?: string; message?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090B]">
      <ErrorView code={code} title={title} message={message} />
    </div>
  );
}
