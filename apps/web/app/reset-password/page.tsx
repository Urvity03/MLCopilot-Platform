'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { ShieldAlert, Check, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MLCopilotLogo } from '../../components/branding/MLCopilotLogo';

const resetSchema = z
  .object({
    password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
    confirm_password: z.string().min(1, { message: 'Please confirm your password.' }),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match.',
    path: ['confirm_password'],
  });

type ResetFields = z.infer<typeof resetSchema>;

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { resetPassword, isResettingPassword, resetPasswordError } = useAuth();
  const [isSuccess, setIsSuccess] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetFields>({
    resolver: zodResolver(resetSchema),
  });

  const passwordVal = watch('password') || '';

  const criteria = [
    { label: 'At least 6 characters', met: passwordVal.length >= 6 },
    { label: 'Contains a number', met: /\d/.test(passwordVal) },
    { label: 'Uppercase or special character', met: /[A-Z]/.test(passwordVal) || /[^A-Za-z0-9]/.test(passwordVal) },
  ];

  const strengthCount = criteria.filter((c) => c.met).length;

  const onSubmit = async (data: ResetFields) => {
    if (!token) return;
    try {
      await resetPassword({ token, new_password: data.password });
      setIsSuccess(true);
    } catch {
      // Error handled by hook
    }
  };

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-2xl bg-[#FF5C74]/10 border border-[#FF5C74]/20 flex items-center justify-center text-[#FF5C74]">
            <ShieldAlert className="h-6 w-6" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-[var(--foreground)]">Invalid Reset Link</h3>
        <p className="text-xs text-[#8B8D98]">The password reset link is missing a valid token.</p>
        <Link
          href="/forgot-password"
          className="inline-block text-xs font-medium text-[var(--primary)] hover:underline mt-2"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-4"
      >
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-2xl bg-[#3DD68C]/10 border border-[#3DD68C]/20 flex items-center justify-center text-[#3DD68C]">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-[var(--foreground)]">Password Reset Complete</h3>
        <p className="text-xs text-[#8B8D98]">Your password has been successfully updated.</p>
        <Link
          href="/login"
          className="inline-block w-full bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white rounded-xl py-3 font-medium text-sm transition-all mt-4"
        >
          Sign In
        </Link>
      </motion.div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[var(--foreground)]">Set New Password</h2>
        <p className="text-sm text-[#8B8D98] mt-1">Please enter your new password below.</p>
      </div>

      {resetPasswordError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex gap-3 rounded-xl border border-[#FF5C74]/20 bg-[#FF5C74]/[0.08] p-3.5 text-[12px] text-[#FF5C74] leading-normal"
        >
          <ShieldAlert className="h-4 w-4 text-[#FF5C74] shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Reset Failed</p>
            <p className="text-[#FF5C74]/70 text-[11px] mt-0.5">Token may be expired or already used.</p>
          </div>
        </motion.div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium text-[#8B8D98] uppercase tracking-wider mb-1.5">
            New Password
          </label>
          <input
            type="password"
            {...register('password')}
            placeholder="••••••••"
            className="w-full bg-[#181A20] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-[var(--foreground)] focus:border-[var(--primary)]/40 focus:ring-1 focus:ring-[var(--primary)]/20 transition-all placeholder:text-[#56585E] outline-none"
            disabled={isResettingPassword}
          />
          {errors.password && (
            <p className="text-[11px] text-[#FF5C74] font-medium mt-1.5">{errors.password.message}</p>
          )}

          {/* Password Strength Indicator */}
          <AnimatePresence>
            {passwordVal && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 space-y-2.5 p-3 rounded-xl bg-[#0D0E12] border border-[rgba(255,255,255,0.04)] overflow-hidden"
              >
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider">
                  <span className="text-[#8B8D98]">Password Strength</span>
                  <span className={strengthCount === 3 ? 'text-[#3DD68C]' : 'text-[#56585E]'}>
                    {strengthCount === 3 ? 'STRONG' : strengthCount >= 2 ? 'MEDIUM' : 'WEAK'}
                  </span>
                </div>

                <div className="flex gap-1 h-1 select-none">
                  {criteria.map((c, i) => (
                    <div
                      key={i}
                      className={`h-full flex-1 rounded-full transition-colors duration-300 ${
                        c.met ? 'bg-[var(--primary)]' : 'bg-[#1E2028]'
                      }`}
                    />
                  ))}
                </div>

                <div className="space-y-1.5">
                  {criteria.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px] text-[#8B8D98]">
                      {c.met ? (
                        <Check className="h-3 w-3 text-[#3DD68C] shrink-0" />
                      ) : (
                        <X className="h-3 w-3 text-[#FF5C74] shrink-0" />
                      )}
                      <span>{c.label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-[#8B8D98] uppercase tracking-wider mb-1.5">
            Confirm New Password
          </label>
          <input
            type="password"
            {...register('confirm_password')}
            placeholder="••••••••"
            className="w-full bg-[#181A20] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-[var(--foreground)] focus:border-[var(--primary)]/40 focus:ring-1 focus:ring-[var(--primary)]/20 transition-all placeholder:text-[#56585E] outline-none"
            disabled={isResettingPassword}
          />
          {errors.confirm_password && (
            <p className="text-[11px] text-[#FF5C74] font-medium mt-1.5">{errors.confirm_password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isResettingPassword}
          className="w-full bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white rounded-xl py-3 font-medium active:scale-[0.97] transition-all mt-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {isResettingPassword ? (
            <div className="flex items-center justify-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          ) : (
            'Reset Password'
          )}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4 font-sans relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-[-20%] left-[50%] translate-x-[-50%] w-[600px] h-[600px] rounded-full bg-[var(--primary)]/[0.04] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-[var(--primary)]/[0.03] blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[400px] flex flex-col items-center"
      >
        {/* Brand Logo */}
        <div className="mb-8">
          <MLCopilotLogo
            size={44}
            showText
            showSubtext
            textClassName="text-base font-semibold text-[var(--foreground)] tracking-tight"
            subtextClassName="text-xs text-[#8B8D98] mt-0.5"
          />
        </div>

        {/* Glass Card */}
        <div className="border-glow bg-[#111217]/60 backdrop-blur-2xl border border-[rgba(255,255,255,0.06)] rounded-2xl p-8 w-full shadow-2xl">
          <Suspense fallback={
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
              </div>
              <p className="text-sm text-[var(--foreground)] font-medium">Loading...</p>
            </div>
          }>
            <ResetPasswordContent />
          </Suspense>
        </div>

        {/* Footer */}
        <p className="text-[11px] text-[#56585E] mt-8 text-center select-none">
          © 2026 MLCopilot. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
