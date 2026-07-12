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
    <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-950/50 text-red-500 border border-red-900/50 mb-6">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <span className="text-xs font-mono font-semibold tracking-wider text-red-500 uppercase mb-2">
        Error Code {code}
      </span>
      <h1 className="text-2xl font-bold tracking-tight text-zinc-100 mb-2">{title}</h1>
      <p className="max-w-md text-sm text-zinc-400 mb-8">{message}</p>
      
      <div className="flex flex-col gap-3 sm:flex-row">
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center justify-center gap-2 rounded-xl bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-700 transition"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Request
          </button>
        )}
        {showBackButton && (
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        )}
      </div>
    </div>
  );
}

export function ErrorPage({ code = '500', title, message }: { code?: string; title?: string; message?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090b]">
      <ErrorView code={code} title={title} message={message} />
    </div>
  );
}
