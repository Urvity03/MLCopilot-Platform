'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MLCopilotLogo } from '../components/branding/MLCopilotLogo';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col items-center justify-center px-4 font-sans relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-[-20%] left-[50%] translate-x-[-50%] w-[500px] h-[500px] rounded-full bg-[var(--primary)]/[0.04] blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-[420px] flex flex-col items-center text-center">
        {/* Brand Logo Header */}
        <div className="mb-8">
          <MLCopilotLogo size={42} showText showSubtext />
        </div>

        {/* 404 Card */}
        <div className="surface-1 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 w-full shadow-lg flex flex-col items-center">
          <span className="text-xs font-semibold font-mono tracking-widest text-[var(--primary)] bg-[var(--primary)]/10 px-3 py-1 rounded-full uppercase mb-3">
            Error 404
          </span>

          <h1 className="text-2xl font-bold text-[var(--foreground)] tracking-tight mb-2">
            Page not found
          </h1>

          <p className="text-sm text-[var(--muted-foreground)] leading-relaxed mb-6">
            The page you&apos;re looking for doesn&apos;t exist or may have been moved.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
            <button
              onClick={() => router.back()}
              className="w-full sm:w-1/2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--foreground)] hover:bg-[var(--secondary)] transition-all cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Go Back</span>
            </button>

            <Link
              href="/dashboard"
              className="w-full sm:w-1/2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary)]/90 transition-all shadow-md cursor-pointer"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Subtle Footer */}
        <p className="text-[11px] text-[var(--muted-foreground)] mt-8 select-none">
          © 2026 MLCopilot. All rights reserved.
        </p>
      </div>
    </div>
  );
}
