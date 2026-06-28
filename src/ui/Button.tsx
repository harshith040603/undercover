import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'danger' | 'glass';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
  /** full-width block button (default true — mobile-first) */
  block?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-civilian text-noir font-semibold shadow-[0_0_30px_-8px_var(--color-civilian)] active:brightness-90',
  danger:
    'bg-undercover text-white font-semibold shadow-[0_0_30px_-8px_var(--color-undercover)] active:brightness-90',
  ghost: 'bg-transparent text-white/80 active:bg-white/10',
  glass: 'glass text-white active:brightness-125',
};

/** Big, thumb-friendly touch target. Min height 56px (mobile-first). */
export function Button({
  children,
  variant = 'primary',
  block = true,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={`flex min-h-14 items-center justify-center gap-2 rounded-2xl px-6 text-base tracking-wide transition disabled:opacity-40 disabled:shadow-none ${
        block ? 'w-full' : ''
      } ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
