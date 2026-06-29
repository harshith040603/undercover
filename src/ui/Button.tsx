import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'danger' | 'glass';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
  /** full-width block button (default true — mobile-first) */
  block?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-civilian text-noir font-semibold active:brightness-95',
  danger: 'bg-undercover text-white font-semibold active:brightness-95',
  ghost: 'bg-transparent text-white/70 active:bg-white/5',
  glass: 'glass text-white active:brightness-110',
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
