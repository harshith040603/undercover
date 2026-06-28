import type { ReactNode } from 'react';

interface ScreenProps {
  children: ReactNode;
  /** extra classes for the inner content column */
  className?: string;
  /** turns on the warm interrogation spotlight behind content */
  spotlight?: boolean;
}

/**
 * Mobile-first app shell. Everything is a single phone-width column,
 * centered on larger screens, with safe-area aware padding.
 */
export function Screen({ children, className = '', spotlight = false }: ScreenProps) {
  return (
    <div className="relative flex min-h-dvh w-full justify-center grain">
      {spotlight && <div className="spotlight pointer-events-none absolute inset-0" />}
      <div
        className={`relative flex w-full max-w-md flex-1 flex-col px-safe pt-safe pb-safe ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

interface TopBarProps {
  title?: string;
  onBack?: () => void;
  right?: ReactNode;
}

export function TopBar({ title, onBack, right }: TopBarProps) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between">
      <div className="flex w-16 justify-start">
        {onBack && (
          <button
            onClick={onBack}
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-2xl text-white/70 active:bg-white/10"
            aria-label="Back"
          >
            ‹
          </button>
        )}
      </div>
      <h1 className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-white/60">
        {title}
      </h1>
      <div className="flex w-16 justify-end">{right}</div>
    </header>
  );
}
