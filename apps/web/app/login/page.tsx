'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/auth';
import { ShieldAlert, KeyRound, Sparkles } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { toast } from '../../components/ui/toast';
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
    <div className="min-h-screen bg-[#030303] flex items-center justify-center p-6 text-zinc-100 relative overflow-hidden font-sans">
      {/* Decorative Glow */}
      <div className="absolute top-[20%] left-[30%] h-[300px] w-[300px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[30%] h-[300px] w-[300px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <Card hoverGlow={false} hoverLift={false} className="p-8 bg-zinc-950/40 border-zinc-800/40 backdrop-blur shadow-2xl relative overflow-hidden">
          {/* Title */}
          <div className="flex flex-col items-center mb-8 select-none">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-950/20 text-emerald-400 border border-emerald-900/25 mb-4 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <KeyRound className="h-4.5 w-4.5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>Welcome Back</span>
            </h1>
            <p className="text-[11px] text-zinc-400 mt-1 font-medium">Sign in to your MLCopilot workspace account</p>
          </div>

          {/* Global Error Banner */}
          {loginError && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 flex gap-3 rounded-lg border border-red-950/50 bg-red-950/15 p-4 text-[11px] text-red-400 leading-normal"
            >
              <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
              <div>
                <p className="font-bold">Authentication Failed</p>
                <p className="text-red-500 font-medium mt-0.5">Please check your email and password credentials.</p>
              </div>
            </motion.div>
          )}

          {/* Form Fields */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                {...register('email')}
                placeholder="name@example.com"
                className="w-full rounded-lg bg-zinc-900/50 border border-zinc-800/80 px-3 py-2.5 text-xs text-zinc-200 placeholder-zinc-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition"
                disabled={isLoggingIn}
              />
              {errors.email && (
                <p className="text-[10px] text-red-400 font-medium mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                {...register('password')}
                placeholder="••••••••"
                className="w-full rounded-lg bg-zinc-900/50 border border-zinc-800/80 px-3 py-2.5 text-xs text-zinc-200 placeholder-zinc-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition"
                disabled={isLoggingIn}
              />
              {errors.password && (
                <p className="text-[10px] text-red-400 font-medium mt-1">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="default"
              size="sm"
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:translate-y-px py-2.5 font-semibold text-xs border border-emerald-500/10 mt-6 h-9 transition shadow-md shadow-emerald-950/10"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-zinc-400 mt-8 font-medium">
            Don't have an account?{' '}
            <Link href="/register" className="font-semibold text-emerald-400 hover:underline">
              Register for free
            </Link>
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
