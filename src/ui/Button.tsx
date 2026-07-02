import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'danger' | 'glass';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
  /** full-width block button (default true — mobile-first) */
  block?: boolean;
}

/**
 * Stamped-block buttons: hard offset shadow that the button physically
 * presses into, like a rubber stamp meeting paper.
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-ink text-paper shadow-[0.25rem_0.25rem_0_rgba(43,36,22,0.30)] active:translate-x-[0.2rem] active:translate-y-[0.2rem] active:shadow-none',
  danger:
    'bg-undercover text-paper shadow-[0.25rem_0.25rem_0_rgba(43,36,22,0.35)] active:translate-x-[0.2rem] active:translate-y-[0.2rem] active:shadow-none',
  ghost:
    'bg-transparent border-2 border-dashed border-ink/35 text-ink/65 active:bg-ink/5 active:text-ink',
  glass:
    'bg-paper text-ink border-2 border-ink shadow-[0.25rem_0.25rem_0_rgba(43,36,22,0.22)] active:translate-x-[0.2rem] active:translate-y-[0.2rem] active:shadow-none',
};

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
      className={`flex min-h-14 items-center justify-center gap-2 rounded-[0.3rem] px-6 font-display text-lg uppercase tracking-[0.06em] transition-[transform,box-shadow,opacity,background-color] duration-100 disabled:pointer-events-none disabled:opacity-30 disabled:shadow-none ${
        block ? 'w-full' : ''
      } ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
