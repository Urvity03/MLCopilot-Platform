import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-all duration-150 outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 active:translate-y-[0.5px] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default: 'bg-primary text-white hover:bg-primary/95 border border-indigo-500/20 shadow-md shadow-indigo-950/20 hover:shadow-indigo-500/10 cursor-pointer',
        outline:
          'border border-zinc-800/80 bg-zinc-950/40 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900/60 hover:border-zinc-700/60 shadow-sm cursor-pointer',
        secondary:
          'bg-zinc-900 text-zinc-200 border border-zinc-800/50 hover:bg-zinc-850 hover:text-zinc-100 cursor-pointer',
        ghost:
          'text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200 cursor-pointer',
        destructive:
          'bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 cursor-pointer',
        link: 'text-primary underline-offset-4 hover:underline cursor-pointer',
      },
      size: {
        default:
          'h-8 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        xs: "h-6 gap-1 rounded-md px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-md px-2.5 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-9 gap-1.5 px-3.5',
        icon: 'size-8',
        'icon-xs':
          "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        'icon-sm':
          'size-7 rounded-md',
        'icon-lg': 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
