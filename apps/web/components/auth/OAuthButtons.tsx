'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { getApiBaseUrl } from '../../lib/config';

// Google "G" logo as inline SVG (official colors)
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

// GitHub mark as inline SVG
const GitHubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

interface OAuthButtonsProps {
  disabled?: boolean;
}

export function OAuthButtons({ disabled = false }: OAuthButtonsProps) {
  const [loadingProvider, setLoadingProvider] = React.useState<string | null>(null);

  const handleOAuth = (provider: 'google' | 'github') => {
    if (disabled || loadingProvider) return;
    setLoadingProvider(provider);
    window.location.href = `${getApiBaseUrl()}/auth/oauth/${provider}`;
  };

  return (
    <div className="space-y-3">
      <motion.button
        type="button"
        onClick={() => handleOAuth('google')}
        disabled={disabled || !!loadingProvider}
        whileTap={{ scale: 0.97 }}
        className="w-full flex items-center justify-center gap-3 bg-white dark:bg-[#181A20] border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.06)] rounded-xl py-3 text-sm font-medium text-[#1f1f1f] dark:text-[#F0F0F3] hover:bg-[#f8f8f8] dark:hover:bg-[#1E2028] hover:border-[rgba(0,0,0,0.25)] dark:hover:border-[rgba(255,255,255,0.1)] transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        aria-label="Continue with Google"
      >
        {loadingProvider === 'google' ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#4285F4] border-t-transparent" />
        ) : (
          <GoogleIcon />
        )}
        <span>Continue with Google</span>
      </motion.button>

      <motion.button
        type="button"
        onClick={() => handleOAuth('github')}
        disabled={disabled || !!loadingProvider}
        whileTap={{ scale: 0.97 }}
        className="w-full flex items-center justify-center gap-3 bg-[#24292e] dark:bg-[#181A20] border border-[#24292e] dark:border-[rgba(255,255,255,0.06)] rounded-xl py-3 text-sm font-medium text-white dark:text-[#F0F0F3] hover:bg-[#2f363d] dark:hover:bg-[#1E2028] hover:border-[#2f363d] dark:hover:border-[rgba(255,255,255,0.1)] transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        aria-label="Continue with GitHub"
      >
        {loadingProvider === 'github' ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <GitHubIcon />
        )}
        <span>Continue with GitHub</span>
      </motion.button>
    </div>
  );
}
