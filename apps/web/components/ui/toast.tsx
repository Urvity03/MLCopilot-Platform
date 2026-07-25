'use client';

import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';

export const toast = sonnerToast;

export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-zinc-950/90 group-[.toaster]:backdrop-blur-md group-[.toaster]:text-zinc-200 group-[.toaster]:border-zinc-800/80 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-xl border-glow text-xs font-medium font-sans px-4 py-3 gap-2 flex items-center",
          description: "group-[.toast]:text-zinc-400 text-[10px] font-medium mt-0.5",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-white font-semibold text-[10px] rounded-lg px-2.5 py-1 hover:bg-primary/95 transition-colors",
          cancelButton: "group-[.toast]:bg-zinc-900 group-[.toast]:text-zinc-400 font-medium text-[10px] rounded-lg px-2 py-1",
        },
      }}
    />
  );
}
