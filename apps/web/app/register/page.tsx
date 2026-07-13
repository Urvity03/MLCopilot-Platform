'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/auth';
import { ShieldAlert, UserPlus, Check } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

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

  const onSubmit = (data: RegisterFields) => {
    registerUser(data);
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
                Build your semantic database in seconds.
              </h1>
            </div>
            
            <p className="text-xs text-zinc-400 leading-relaxed font-medium max-w-sm">
              Initialize workspace nodes, ingest research databases, generate vector partitions, and start conversing with your corpus directly.
            </p>

            {/* Checklist */}
            <div className="space-y-3 pt-6 border-t border-zinc-900/60 max-w-sm">
              {[
                { title: "Personal or Pinned Workspaces", desc: "Isolate document directories and logs per project." },
                { title: "Similarity Score Analytics", desc: "Audit matching chunk citations for every AI response." },
                { title: "Collaborative Team Access", desc: "Invite members and manage roles and credentials." }
              ].map((benefit, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="h-5 w-5 rounded-full bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                    <Check className="h-3 w-3" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200">{benefit.title}</h4>
                    <p className="text-[10px] text-zinc-555 leading-normal font-medium mt-0.5">{benefit.desc}</p>
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
          <div className="absolute top-[20%] left-[20%] h-[250px] w-[250px] rounded-full bg-violet-500/3 blur-[90px] pointer-events-none" />
          
          <div className="w-full max-w-md space-y-6">
            <div className="bg-zinc-950/40 border border-zinc-800/40 rounded-xl p-8 shadow-2xl glass-card relative overflow-hidden">
              {/* Title */}
              <div className="flex flex-col items-center mb-8 select-none">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-950/20 text-indigo-400 border border-indigo-900/25 mb-4 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                  <UserPlus className="h-4.5 w-4.5" />
                </div>
                <h2 className="text-lg font-bold tracking-tight text-white">Create Account</h2>
                <p className="text-[11px] text-zinc-550 mt-1 font-medium">Get started with MLCopilot platform</p>
              </div>

              {/* Global Error Banner */}
              {registerError && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-6 flex gap-3 rounded-lg border border-rose-955/50 bg-rose-955/15 p-4 text-[11px] text-rose-455 leading-normal"
                >
                  <ShieldAlert className="h-4.5 w-4.5 text-rose-400 shrink-0" />
                  <div>
                    <p className="font-bold">Registration Failed</p>
                    <p className="text-rose-400/80 font-medium mt-0.5">Email address may already be in use.</p>
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
                    className="w-full rounded-lg bg-zinc-900/50 border border-zinc-800/80 px-3 py-2.5 text-xs text-zinc-200 placeholder-zinc-500 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition outline-none"
                    disabled={isRegistering}
                  />
                  {errors.full_name && (
                    <p className="text-[10px] text-rose-400 font-medium mt-1">{errors.full_name.message}</p>
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
                    className="w-full rounded-lg bg-zinc-900/50 border border-zinc-800/80 px-3 py-2.5 text-xs text-zinc-200 placeholder-zinc-500 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition outline-none"
                    disabled={isRegistering}
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
                    disabled={isRegistering}
                  />
                  {errors.password && (
                    <p className="text-[10px] text-rose-400 font-medium mt-1">{errors.password.message}</p>
                  )}

                  {/* Password Strength Validation Checklist */}
                  <AnimatePresence>
                    {passwordVal && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2.5 space-y-2 p-3 rounded-lg bg-zinc-950/45 border border-zinc-900 overflow-hidden font-sans"
                      >
                        <div className="flex items-center justify-between text-[8px] font-bold text-zinc-550 uppercase tracking-wider font-mono">
                          <span>Password Strength</span>
                          <span className={((passwordVal.length >= 6 ? 1 : 0) + (/\d/.test(passwordVal) ? 1 : 0) + (/[A-Z]/.test(passwordVal) || /[^A-Za-z0-9]/.test(passwordVal) ? 1 : 0)) === 3 ? 'text-indigo-400' : 'text-zinc-600'}>
                            {((passwordVal.length >= 6 ? 1 : 0) + (/\d/.test(passwordVal) ? 1 : 0) + (/[A-Z]/.test(passwordVal) || /[^A-Za-z0-9]/.test(passwordVal) ? 1 : 0)) === 3 ? 'STRONG' : 'WEAK'}
                          </span>
                        </div>
                        
                        <div className="flex gap-1 h-1 select-none">
                          <div className={`h-full flex-1 rounded transition-colors duration-300 ${passwordVal.length >= 6 ? 'bg-indigo-500 shadow-[0_0_5px_rgba(99,102,241,0.2)]' : 'bg-zinc-850'}`} />
                          <div className={`h-full flex-1 rounded transition-colors duration-300 ${/\d/.test(passwordVal) ? 'bg-indigo-500 shadow-[0_0_5px_rgba(99,102,241,0.2)]' : 'bg-zinc-850'}`} />
                          <div className={`h-full flex-1 rounded transition-colors duration-300 ${/[A-Z]/.test(passwordVal) || /[^A-Za-z0-9]/.test(passwordVal) ? 'bg-indigo-500 shadow-[0_0_5px_rgba(99,102,241,0.2)]' : 'bg-zinc-850'}`} />
                        </div>

                        <div className="space-y-1 text-[9px] text-zinc-500 font-medium">
                          <div className="flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full transition-colors ${passwordVal.length >= 6 ? 'bg-indigo-500' : 'bg-zinc-850'}`} />
                            <span>At least 6 characters</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full transition-colors ${/\d/.test(passwordVal) ? 'bg-indigo-500' : 'bg-zinc-850'}`} />
                            <span>Contains numeric character</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full transition-colors ${/[A-Z]/.test(passwordVal) || /[^A-Za-z0-9]/.test(passwordVal) ? 'bg-indigo-500' : 'bg-zinc-850'}`} />
                            <span>Contains uppercase or special character</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  className="w-full bg-primary hover:bg-primary/95 active:translate-y-px py-2.5 font-bold text-xs border border-indigo-500/20 mt-6 h-9 transition shadow-md shadow-indigo-950/20 cursor-pointer animate-none"
                  disabled={isRegistering}
                >
                  {isRegistering ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>

              <p className="text-center text-xs text-zinc-400 mt-8 font-medium">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-indigo-400 hover:text-indigo-300 hover:underline transition-colors">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
