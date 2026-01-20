import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        // Default ember primary badge
        default: 'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-ember-600',
        // Ember badge with glow effect
        ember:
          'border-transparent bg-gradient-to-r from-ember-500 via-ember-400 to-ember-500 text-text-inverse font-semibold shadow-[0_0_10px_rgba(255,107,0,0.3)] [a&]:hover:shadow-[0_0_15px_rgba(255,107,0,0.5)]',
        // Ember outline badge
        'ember-outline':
          'border-ember-500 text-ember-500 bg-transparent [a&]:hover:bg-ember-500/10',
        // Secondary badge
        secondary:
          'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-bg-subtle',
        // Destructive badge
        destructive:
          'border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/40',
        // Outline badge
        outline:
          'border-border-default text-foreground bg-transparent [a&]:hover:bg-bg-surface [a&]:hover:text-text-primary',
        // Success badge
        success: 'border-transparent bg-success text-text-inverse [a&]:hover:bg-success/90',
        // Warning badge
        warning: 'border-transparent bg-warning text-text-inverse [a&]:hover:bg-warning/90',
        // Info badge
        info: 'border-transparent bg-info text-white [a&]:hover:bg-info/90',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface BadgeProps extends React.ComponentProps<'span'>, VariantProps<typeof badgeVariants> {
  asChild?: boolean;
}

function Badge({ className, variant, asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot : 'span';

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
export type { BadgeProps };
