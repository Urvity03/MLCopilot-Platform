'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { ShieldAlert, CheckCircle2, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const forgotSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

type ForgotFields = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const { forgotPassword, isSendingReset, forgotPasswordError } = useAuth();
  const [successData, setSuccessData] = React.useState<{ message: string; reset_link?: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFields>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotFields) => {
    try {
      const res = await forgotPassword(data.email);
      setSuccessData(res);
    } catch {
      // Error handled by hook
    }
  };

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
        {/* Animated Logo */}
        <div className="flex flex-col items-center mb-8 select-none">
          <div className="relative mb-3">
            <div className="h-12 w-12 rounded-2xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)] font-bold text-xl shadow-[0_0_30px_rgba(124,92,252,0.15)]">
              M
            </div>
            <div className="absolute inset-0 rounded-2xl border border-[var(--primary)]/10 animate-ping opacity-20 pointer-events-none" />
          </div>
          <span className="text-[var(--foreground)] font-semibold text-base tracking-tight">MLCopilot</span>
          <span className="text-xs text-[#8B8D98] mt-0.5">AI Knowledge Operating System</span>
        </div>

        {/* Glass Card */}
        <div className="border-glow bg-[#111217]/60 backdrop-blur-2xl border border-[rgba(255,255,255,0.06)] rounded-2xl p-8 w-full shadow-2xl">
          {/* Back link */}
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-[#8B8D98] hover:text-[var(--foreground)] transition-colors mb-6 font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to sign in</span>
          </Link>

          {/* Title */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">Reset Password</h2>
            <p className="text-sm text-[#8B8D98] mt-1">Enter your email and we will send you a link to reset your password.</p>
          </div>

          {successData ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#3DD68C]/10 border border-[#3DD68C]/20 text-[#3DD68C]">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <p className="text-xs font-medium leading-relaxed">{successData.message}</p>
              </div>

              {successData.reset_link && (
                <div className="p-3.5 rounded-xl bg-[#181A20] border border-[rgba(255,255,255,0.06)] space-y-2">
                  <p className="text-[11px] font-semibold text-[var(--primary)] uppercase tracking-wider">
                    Development Reset Link:
                  </p>
                  <Link
                    href={successData.reset_link}
                    className="text-xs text-[var(--primary)] underline break-all hover:opacity-80 transition-opacity"
                  >
                    {successData.reset_link}
                  </Link>
                </div>
              )}
            </motion.div>
          ) : (
            <>
              {/* Error Banner */}
              {forgotPasswordError && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5 flex gap-3 rounded-xl border border-[#FF5C74]/20 bg-[#FF5C74]/[0.08] p-3.5 text-[12px] text-[#FF5C74] leading-normal"
                >
                  <ShieldAlert className="h-4 w-4 text-[#FF5C74] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Request Failed</p>
                    <p className="text-[#FF5C74]/70 text-[11px] mt-0.5">Failed to send password reset link.</p>
                  </div>
                </motion.div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-medium text-[#8B8D98] uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    {...register('email')}
                    placeholder="name@example.com"
                    className="w-full bg-[#181A20] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-[var(--foreground)] focus:border-[var(--primary)]/40 focus:ring-1 focus:ring-[var(--primary)]/20 transition-all placeholder:text-[#56585E] outline-none"
                    disabled={isSendingReset}
                  />
                  {errors.email && (
                    <p className="text-[11px] text-[#FF5C74] font-medium mt-1.5">{errors.email.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSendingReset}
                  className="w-full bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white rounded-xl py-3 font-medium active:scale-[0.97] transition-all mt-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSendingReset ? (
                    <div className="flex items-center justify-center">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-[11px] text-[#56585E] mt-8 text-center select-none">
          © 2026 MLCopilot. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
