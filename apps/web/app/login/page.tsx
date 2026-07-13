'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/auth';
import { ShieldAlert, KeyRound, Sparkles, Check } from 'lucide-react';
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
    <div className="min-h-screen bg-[#09090B] text-zinc-100 flex overflow-hidden font-sans relative">
      {/* Split grid for desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 w-full min-h-screen z-10">
        
        {/* Left Side: Brand Hero Panel (Hidden on mobile/tablet) */}
        <div className="hidden lg:flex lg:col-span-5 bg-[#0C0C0E] border-r border-zinc-900/60 p-12 flex-col justify-between relative overflow-hidden">
          {/* Background grid design */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#141416_1px,transparent_1px),linear-gradient(to_bottom,#141416_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-30" />
          <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />
          
          <div className="relative z-10 flex items-center gap-2 font-bold tracking-tight text-gradient-indigo text-lg select-none">
            <span className="h-6 w-6 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-mono text-sm shadow-[0_0_15px_rgba(99,102,241,0.1)]">
              M
            </span>
            <span>MLCopilot</span>
          </div>

          <div className="relative z-10 my-auto space-y-6">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-indigo-500/20 bg-indigo-950/15 text-[10px] font-bold text-indigo-400 font-mono tracking-wider uppercase">
                Enterprise AI SaaS
              </span>
              <h1 className="text-3xl font-bold tracking-tight leading-tight text-white max-w-sm">
                The workspace engine for your AI corpus.
              </h1>
            </div>
            
            <p className="text-xs text-zinc-400 leading-relaxed font-medium max-w-sm">
              Connect textbooks, files, codebases, or API logs. Split into chunks, generate high-performance semantic vector indices, and start querying.
            </p>

            {/* Checklist */}
            <div className="space-y-3 pt-6 border-t border-zinc-900/60 max-w-sm">
              {[
                { title: "Retrieval-Augmented Generation", desc: "Interact with indexed vector tokens in real time." },
                { title: "Automated Parser Pipeline", desc: "PDF, DOCX, Markdown, and TXT auto-splitting." },
                { title: "pgvector Vector Storage", desc: "Enterprise indexing on standard PostgreSQL databases." }
              ].map((benefit, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="h-5 w-5 rounded-full bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                    <Check className="h-3 w-3" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200">{benefit.title}</h4>
                    <p className="text-[10px] text-zinc-550 leading-normal font-medium mt-0.5">{benefit.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 text-[10px] text-zinc-600 font-mono select-none">
            <span>© 2026 MLCopilot. Trusted by enterprise engineering teams.</span>
          </div>
        </div>

        {/* Right Side: Form Panel */}
        <div className="col-span-1 lg:col-span-7 flex flex-col justify-center items-center p-6 md:p-12 bg-[#09090B] relative">
          {/* Small background glows */}
          <div className="absolute top-[20%] right-[20%] h-[250px] w-[250px] rounded-full bg-violet-500/3 blur-[90px] pointer-events-none" />
          
          <div className="w-full max-w-md space-y-6">
            <div className="bg-zinc-950/40 border border-zinc-800/40 rounded-xl p-8 shadow-2xl glass-card relative overflow-hidden">
              {/* Title */}
              <div className="flex flex-col items-center mb-8 select-none">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-950/20 text-indigo-400 border border-indigo-900/25 mb-4 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                  <KeyRound className="h-4.5 w-4.5" />
                </div>
                <h2 className="text-lg font-bold tracking-tight text-white">Welcome Back</h2>
                <p className="text-[11px] text-zinc-550 mt-1 font-medium">Sign in to your MLCopilot workspace account</p>
              </div>

              {/* Global Error Banner */}
              {loginError && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-6 flex gap-3 rounded-lg border border-rose-955/50 bg-rose-955/15 p-4 text-[11px] text-rose-400 leading-normal"
                >
                  <ShieldAlert className="h-4.5 w-4.5 text-rose-400 shrink-0" />
                  <div>
                    <p className="font-bold">Authentication Failed</p>
                    <p className="text-rose-400/80 font-medium mt-0.5">Please check your email and password credentials.</p>
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
                    className="w-full rounded-lg bg-zinc-900/50 border border-zinc-800/80 px-3 py-2.5 text-xs text-zinc-200 placeholder-zinc-500 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition outline-none"
                    disabled={isLoggingIn}
                  />
                  {errors.email && (
                    <p className="text-[10px] text-rose-400 font-medium mt-1">{errors.email.message}</p>
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
                    className="w-full rounded-lg bg-zinc-900/50 border border-zinc-800/80 px-3 py-2.5 text-xs text-zinc-200 placeholder-zinc-500 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition outline-none"
                    disabled={isLoggingIn}
                  />
                  {errors.password && (
                    <p className="text-[10px] text-rose-400 font-medium mt-1">{errors.password.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  className="w-full bg-primary hover:bg-primary/95 active:translate-y-px py-2.5 font-bold text-xs border border-indigo-500/20 mt-6 h-9 transition shadow-md shadow-indigo-950/20 cursor-pointer animate-none"
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
                <Link href="/register" className="font-semibold text-indigo-400 hover:text-indigo-300 hover:underline transition-colors">
                  Register for free
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
