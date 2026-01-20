import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*="size-"])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
  {
    variants: {
      variant: {
        // Default ember primary button
        default:
          'bg-primary text-primary-foreground shadow-sm hover:bg-ember-600 active:bg-ember-700',
        // Ember button with glow effect (for CTAs)
        ember:
          'bg-gradient-to-r from-ember-500 via-ember-400 to-ember-500 text-text-inverse font-semibold shadow-[0_0_20px_rgba(255,107,0,0.3)] hover:shadow-[0_0_30px_rgba(255,107,0,0.5)] hover:brightness-110 active:brightness-95',
        // Ember outline variant
        'ember-outline':
          'border-2 border-ember-500 text-ember-500 bg-transparent hover:bg-ember-500/10 hover:shadow-[0_0_15px_rgba(255,107,0,0.2)] active:bg-ember-500/20',
        // Destructive (error)
        destructive:
          'bg-destructive text-white shadow-sm hover:bg-destructive/90 focus-visible:ring-destructive/40',
        // Outline variant
        outline:
          'border border-border-default bg-transparent shadow-xs hover:bg-bg-surface hover:border-border-prominent hover:text-text-primary',
        // Secondary variant
        secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-bg-subtle',
        // Ghost variant
        ghost: 'hover:bg-bg-surface hover:text-text-primary',
        // Link variant
        link: 'text-ember-500 underline-offset-4 hover:underline hover:text-ember-400',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 text-xs has-[>svg]:px-2.5',
        lg: 'h-11 rounded-md px-6 text-base has-[>svg]:px-4',
        xl: 'h-12 rounded-lg px-8 text-base has-[>svg]:px-6',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

interface ButtonProps extends React.ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
export type { ButtonProps };
