'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/auth';
import { ShieldAlert, UserPlus } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { motion } from 'framer-motion';

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
    formState: { errors },
  } = useForm<RegisterFields>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (data: RegisterFields) => {
    registerUser(data);
  };

  return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center p-6 text-zinc-100 relative overflow-hidden font-sans">
      {/* Decorative Glow */}
      <div className="absolute top-[20%] right-[30%] h-[300px] w-[300px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[30%] h-[300px] w-[300px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />

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
              <UserPlus className="h-4.5 w-4.5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Create Account</h1>
            <p className="text-[11px] text-zinc-400 mt-1 font-medium">Get started with MLCopilot platform</p>
          </div>

          {/* Global Error Banner */}
          {registerError && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 flex gap-3 rounded-lg border border-red-950/50 bg-red-950/15 p-4 text-[11px] text-red-400 leading-normal"
            >
              <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
              <div>
                <p className="font-bold">Registration Failed</p>
                <p className="text-red-500 font-medium mt-0.5">Email address may already be in use.</p>
              </div>
            </motion.div>
          )}

          {/* Form Fields */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Full Name
              </label>
              <input
                type="text"
                {...register('full_name')}
                placeholder="John Doe"
                className="w-full rounded-lg bg-zinc-900/50 border border-zinc-800/80 px-3 py-2.5 text-xs text-zinc-155 placeholder-zinc-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition"
                disabled={isRegistering}
              />
              {errors.full_name && (
                <p className="text-[10px] text-red-400 font-medium mt-1">{errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                {...register('email')}
                placeholder="name@example.com"
                className="w-full rounded-lg bg-zinc-900/50 border border-zinc-800/80 px-3 py-2.5 text-xs text-zinc-150 placeholder-zinc-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition"
                disabled={isRegistering}
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
                className="w-full rounded-lg bg-zinc-900/50 border border-zinc-800/80 px-3 py-2.5 text-xs text-zinc-150 placeholder-zinc-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition"
                disabled={isRegistering}
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
              disabled={isRegistering}
            >
              {isRegistering ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-zinc-450 mt-8 font-medium">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-emerald-400 hover:underline">
              Sign In
            </Link>
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
