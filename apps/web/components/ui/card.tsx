'use client';

import * as React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLMotionProps<'div'> {
  hoverGlow?: boolean;
  hoverLift?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hoverGlow = true, hoverLift = true, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          "rounded-xl glass-card border border-zinc-800/40 text-card-foreground p-6 overflow-hidden relative",
          hoverLift && "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-emerald-950/10 hover:border-emerald-500/20",
          hoverGlow && "glow-hover-emerald",
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 mb-4", className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-sm font-semibold leading-none tracking-tight text-zinc-100",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs text-zinc-500", className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-sm text-zinc-300", className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-4 border-t border-zinc-900/60 mt-6", className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
