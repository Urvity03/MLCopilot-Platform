'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/auth';
import { ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

type LoginFields = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoggingIn, loginError } = useAuth();
  const { isAuthenticated } = useAuthStore();

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFields) => {
    login(data);
  };

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center px-4 font-sans relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-[-20%] left-[50%] translate-x-[-50%] w-[600px] h-[600px] rounded-full bg-[#7C5CFC]/[0.04] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-[#7C5CFC]/[0.03] blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[400px] flex flex-col items-center"
      >
        {/* Animated Logo */}
        <div className="flex flex-col items-center mb-8 select-none">
          <div className="relative mb-3">
            <div className="h-12 w-12 rounded-2xl bg-[#7C5CFC]/10 border border-[#7C5CFC]/20 flex items-center justify-center text-[#7C5CFC] font-bold text-xl shadow-[0_0_30px_rgba(124,92,252,0.15)]">
              M
            </div>
            <div className="absolute inset-0 rounded-2xl border border-[#7C5CFC]/10 animate-ping opacity-20 pointer-events-none" />
          </div>
          <span className="text-[#F0F0F3] font-semibold text-base tracking-tight">MLCopilot</span>
          <span className="text-xs text-[#8B8D98] mt-0.5">AI Knowledge Operating System</span>
        </div>

        {/* Glass Card */}
        <div className="border-glow bg-[#111217]/60 backdrop-blur-2xl border border-[rgba(255,255,255,0.06)] rounded-2xl p-8 w-full shadow-2xl">
          {/* Title */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-[#F0F0F3]">Welcome back</h2>
            <p className="text-sm text-[#8B8D98] mt-1">Sign in to continue to your workspace</p>
          </div>

          {/* Error Banner */}
          {loginError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-5 flex gap-3 rounded-xl border border-[#FF5C74]/20 bg-[#FF5C74]/[0.08] p-3.5 text-[12px] text-[#FF5C74] leading-normal"
            >
              <ShieldAlert className="h-4 w-4 text-[#FF5C74] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Authentication Failed</p>
                <p className="text-[#FF5C74]/70 text-[11px] mt-0.5">Please check your email and password credentials.</p>
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
                className="w-full bg-[#181A20] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-[#F0F0F3] focus:border-[#7C5CFC]/40 focus:ring-1 focus:ring-[#7C5CFC]/20 transition-all placeholder:text-[#56585E] outline-none"
                disabled={isLoggingIn}
              />
              {errors.email && (
                <p className="text-[11px] text-[#FF5C74] font-medium mt-1.5">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#8B8D98] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                {...register('password')}
                placeholder="••••••••"
                className="w-full bg-[#181A20] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-[#F0F0F3] focus:border-[#7C5CFC]/40 focus:ring-1 focus:ring-[#7C5CFC]/20 transition-all placeholder:text-[#56585E] outline-none"
                disabled={isLoggingIn}
              />
              {errors.password && (
                <p className="text-[11px] text-[#FF5C74] font-medium mt-1.5">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-[#7C5CFC] hover:bg-[#6B4FE0] text-white rounded-xl py-3 font-medium active:scale-[0.97] transition-all mt-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoggingIn ? (
                <div className="flex items-center justify-center">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
            <span className="text-[11px] text-[#56585E] font-medium">or</span>
            <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
          </div>

          {/* Register Link */}
          <p className="text-center text-sm text-[#8B8D98]">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-medium text-[#7C5CFC] hover:text-[#9B82FC] transition-colors">
              Create one
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-[11px] text-[#56585E] mt-8 text-center select-none">
          © 2026 MLCopilot. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
