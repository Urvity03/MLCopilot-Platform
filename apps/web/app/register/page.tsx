'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/auth';
import { ShieldAlert, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { OAuthButtons } from '../../components/auth/OAuthButtons';

const registerSchema = z.object({
  full_name: z.string().min(1, { message: 'Display name is required.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type RegisterFields = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isRegistering, registerError } = useAuth();
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
    watch,
    formState: { errors },
  } = useForm<RegisterFields>({
    resolver: zodResolver(registerSchema),
  });

  const passwordVal = watch('password') || '';

  const criteria = [
    { label: 'At least 6 characters', met: passwordVal.length >= 6 },
    { label: 'Contains a number', met: /\d/.test(passwordVal) },
    { label: 'Uppercase or special character', met: /[A-Z]/.test(passwordVal) || /[^A-Za-z0-9]/.test(passwordVal) },
  ];

  const strengthCount = criteria.filter((c) => c.met).length;

  const onSubmit = (data: RegisterFields) => {
    registerUser(data);
  };

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center px-4 font-sans relative overflow-hidden">
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
          <span className="text-[#F0F0F3] font-semibold text-base tracking-tight">MLCopilot</span>
          <span className="text-xs text-[#8B8D98] mt-0.5">AI Knowledge Operating System</span>
        </div>

        {/* Glass Card */}
        <div className="border-glow bg-[#111217]/60 backdrop-blur-2xl border border-[rgba(255,255,255,0.06)] rounded-2xl p-8 w-full shadow-2xl">
          {/* Title */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-[#F0F0F3]">Create your account</h2>
            <p className="text-sm text-[#8B8D98] mt-1">Get started with MLCopilot</p>
          </div>

          {/* Error Banner */}
          {registerError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-5 flex gap-3 rounded-xl border border-[#FF5C74]/20 bg-[#FF5C74]/[0.08] p-3.5 text-[12px] text-[#FF5C74] leading-normal"
            >
              <ShieldAlert className="h-4 w-4 text-[#FF5C74] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Registration Failed</p>
                <p className="text-[#FF5C74]/70 text-[11px] mt-0.5">Email address may already be in use.</p>
              </div>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-[11px] font-medium text-[#8B8D98] uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                {...register('full_name')}
                placeholder="John Doe"
                className="w-full bg-[#181A20] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-[#F0F0F3] focus:border-[var(--primary)]/40 focus:ring-1 focus:ring-[var(--primary)]/20 transition-all placeholder:text-[#56585E] outline-none"
                disabled={isRegistering}
              />
              {errors.full_name && (
                <p className="text-[11px] text-[#FF5C74] font-medium mt-1.5">{errors.full_name.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-[11px] font-medium text-[#8B8D98] uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                {...register('email')}
                placeholder="name@example.com"
                className="w-full bg-[#181A20] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-[#F0F0F3] focus:border-[var(--primary)]/40 focus:ring-1 focus:ring-[var(--primary)]/20 transition-all placeholder:text-[#56585E] outline-none"
                disabled={isRegistering}
              />
              {errors.email && (
                <p className="text-[11px] text-[#FF5C74] font-medium mt-1.5">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-medium text-[#8B8D98] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                {...register('password')}
                placeholder="••••••••"
                className="w-full bg-[#181A20] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 text-sm text-[#F0F0F3] focus:border-[var(--primary)]/40 focus:ring-1 focus:ring-[var(--primary)]/20 transition-all placeholder:text-[#56585E] outline-none"
                disabled={isRegistering}
              />
              {errors.password && (
                <p className="text-[11px] text-[#FF5C74] font-medium mt-1.5">{errors.password.message}</p>
              )}

              {/* Password Strength */}
              <AnimatePresence>
                {passwordVal && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 space-y-2.5 p-3 rounded-xl bg-[#0D0E12] border border-[rgba(255,255,255,0.04)] overflow-hidden"
                  >
                    {/* Strength label */}
                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider">
                      <span className="text-[#8B8D98]">Password Strength</span>
                      <span className={strengthCount === 3 ? 'text-[#3DD68C]' : 'text-[#56585E]'}>
                        {strengthCount === 3 ? 'STRONG' : strengthCount >= 2 ? 'MEDIUM' : 'WEAK'}
                      </span>
                    </div>

                    {/* Strength bar — 3 segments */}
                    <div className="flex gap-1 h-1 select-none">
                      {criteria.map((c, i) => (
                        <div
                          key={i}
                          className={`h-full flex-1 rounded-full transition-colors duration-300 ${
                            c.met
                              ? 'bg-[var(--primary)] shadow-[0_0_6px_rgba(var(--primary-rgb, 124,92,252),0.3)]'
                              : 'bg-[#1E2028]'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Criteria list */}
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

            <button
              type="submit"
              disabled={isRegistering}
              className="w-full bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white rounded-xl py-3 font-medium active:scale-[0.97] transition-all mt-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isRegistering ? (
                <div className="flex items-center justify-center">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
            <span className="text-[11px] text-[#56585E] font-medium">or</span>
            <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
          </div>

          <OAuthButtons disabled={isRegistering} />

          <div className="my-4" />

          {/* Login Link */}
          <p className="text-center text-sm text-[#8B8D98]">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors">
              Sign in
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
