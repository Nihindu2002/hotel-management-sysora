import type { ReactNode } from 'react';

/**
 * Shared scaffolding for the /account pages: every one opens with the same
 * eyebrow, heading and optional action, and the same loading / error / empty
 * treatment, so the account area reads as one place.
 */

export function AccountHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="text-[10px] tracking-[0.3em] text-gold-ink uppercase">{eyebrow}</p>
        )}
        <h1 className="mt-3 text-[clamp(1.6rem,3.6vw,2.6rem)] leading-[1.05] font-semibold tracking-[-0.015em] uppercase">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-xl text-sm leading-[1.9] text-muted">{description}</p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Inline error banner, used for load and submit failures alike. */
export function AccountError({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="border-l-2 border-danger bg-danger/5 px-4 py-3 text-sm text-muted"
    >
      {children}
    </p>
  );
}

/** Inline success confirmation. */
export function AccountSuccess({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="border-l-2 border-success bg-success/5 px-4 py-3 text-sm text-muted"
    >
      {children}
    </p>
  );
}

export function AccountLoading({ label }: { label: string }) {
  return (
    <p className="py-16 text-center text-sm text-muted" role="status">
      {label}
    </p>
  );
}

export function AccountEmpty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="border border-dashed border-line px-6 py-16 text-center">
      <p className="text-sm tracking-[0.18em] text-muted uppercase">{title}</p>
      {hint && <p className="mt-3 text-sm text-muted">{hint}</p>}
    </div>
  );
}

/** Small outlined action, matching the landing page's buttons. */
export const OUTLINE_BUTTON =
  'inline-block rounded-full border border-line px-7 py-3 text-[11px] uppercase tracking-[0.22em] text-ink transition-colors duration-500 hover:border-navy hover:bg-royal hover:text-white';

/** Filled navy action, for the single primary thing on a page. */
export const SOLID_BUTTON =
  'inline-block rounded-full bg-navy px-7 py-3 text-[11px] uppercase tracking-[0.22em] text-white transition-colors duration-500 hover:bg-royal disabled:cursor-not-allowed disabled:opacity-50';

/** Text input styled as a hairline rule rather than a boxed field. */
export const FIELD_INPUT =
  'w-full border-b border-line bg-transparent py-2.5 text-sm text-ink outline-none transition-colors duration-300 focus:border-royal';

/** Uppercase micro-label that sits above a field. */
export const FIELD_LABEL = 'block text-[10px] tracking-[0.24em] text-muted uppercase';
