import type { ReactNode } from 'react';

interface ScreenProps {
  children: ReactNode;
  className?: string;
  spotlight?: boolean;
}

/**
 * Mobile-first app shell: a manila folder under a desk lamp.
 * Single phone-width column, centered on larger screens, with
 * safe-area aware padding and a paper-fibre overlay.
 */
export function Screen({ children, className = '', spotlight = false }: ScreenProps) {
  return (
    <div className="grain relative flex min-h-dvh w-full justify-center">
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
    <header className="flex h-14 shrink-0 items-center justify-between">
      <div className="flex w-10 justify-start">
        {onBack && (
          <button
            onClick={onBack}
            className="-ml-1 flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink/25 text-ink/60 transition-colors active:border-ink active:text-ink"
            aria-label="Back"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path
                d="M12.5 15l-5-5 5-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      <h1 className="text-[11px] font-bold uppercase tracking-[0.3em] text-ink/55">
        {title}
      </h1>

      <div className="flex w-10 justify-end">{right}</div>
    </header>
  );
}
