'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '../../../store/auth';
import { authService } from '../../../services/auth';
import { motion } from 'framer-motion';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuthStore();
  const [error, setError] = React.useState<string | null>(null);
  const hasRun = React.useRef(false);

  React.useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      setTimeout(() => router.push(`/login?error=${encodeURIComponent(errorParam)}`), 3000);
      return;
    }

    const exchangeToken = async () => {
      try {
        const response = await authService.refresh();
        const token = response.access_token;
        
        let user;
        try {
          // Store token temporarily to fetch /auth/me
          setSession({ id: '', email: '', full_name: '', is_active: true, is_superuser: false, created_at: '', updated_at: '' }, token);
          user = await authService.me();
        } catch {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(atob(base64));
          user = {
            id: payload.sub,
            email: '',
            full_name: 'OAuth User',
            is_active: true,
            is_superuser: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }

        setSession(user, token);
        router.push('/dashboard');
      } catch (err) {
        setError('Failed to complete authentication. Please try again.');
        setTimeout(() => router.push('/login'), 3000);
      }
    };

    exchangeToken();
  }, [searchParams, router, setSession]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center gap-4"
    >
      {error ? (
        <>
          <div className="h-12 w-12 rounded-2xl bg-[#FF5C74]/10 border border-[#FF5C74]/20 flex items-center justify-center">
            <span className="text-[#FF5C74] text-xl">✕</span>
          </div>
          <p className="text-sm text-[#FF5C74] font-medium">{error}</p>
          <p className="text-xs text-[#8B8D98]">Redirecting to login...</p>
        </>
      ) : (
        <>
          <div className="h-12 w-12 rounded-2xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
          </div>
          <p className="text-sm text-[var(--foreground)] font-medium">Completing sign in...</p>
          <p className="text-xs text-[#8B8D98]">Please wait while we set up your session.</p>
        </>
      )}
    </motion.div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4 font-sans">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
          </div>
          <p className="text-sm text-[var(--foreground)] font-medium">Loading...</p>
        </div>
      }>
        <CallbackContent />
      </Suspense>
    </div>
  );
}
