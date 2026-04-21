import type { ButtonHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-foreground shadow-glow hover:translate-y-[-1px] hover:brightness-110',
  secondary:
    'bg-card text-card-foreground border border-border hover:bg-muted/60 hover:text-foreground',
  ghost:
    'bg-transparent text-foreground hover:bg-white/5',
  danger:
    'bg-danger text-white hover:brightness-110'
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', type = 'button', asChild = false, ...props },
  ref
) {
  const Comp = asChild ? Slot : 'button';
  const componentProps = asChild ? props : { ...props, type };

  return (
    <Comp
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        className
      )}
      {...componentProps}
    />
  );
});
