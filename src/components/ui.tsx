/**
 * Small presentational building blocks shared by both tools.
 */
import type { ReactNode, InputHTMLAttributes } from 'react';

export function Card({
  title,
  children,
  step,
}: {
  title: string;
  children: ReactNode;
  step?: string;
}) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-4">
        {step && (
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-albarakah-500 text-xs font-bold text-white">
            {step}
          </span>
        )}
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

export const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-albarakah-500 focus:border-albarakah-500';

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ''}`} />;
}

/** Numeric input that keeps an empty string editable but reports a number. */
export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 'any',
  disabled,
  suffix,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: string;
  disabled?: boolean;
  suffix?: string;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : ''}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => {
          const n = e.target.value === '' ? 0 : Number(e.target.value);
          onChange(Number.isNaN(n) ? 0 : n);
        }}
        className={`${inputCls} ${suffix ? 'pr-12' : ''} ${
          disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''
        }`}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
          {suffix}
        </span>
      )}
    </div>
  );
}

export function ResultRow({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-baseline justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-right">
        <span className="text-sm font-semibold text-slate-800 tabular-nums">{value}</span>
        {sub && <span className="block text-[11px] text-slate-400">{sub}</span>}
      </span>
    </div>
  );
}

/**
 * Reusable rate-tier builder. The last tier's duration is implicit (fills to the
 * tenure) and shown disabled. Used by both the loan and rebate tools.
 */
export function TierBuilder({
  tiers,
  lastEffectiveDuration,
  onUpdate,
  onAdd,
  onRemove,
}: {
  tiers: { durationYears: number; ratePercent: number }[];
  lastEffectiveDuration: number;
  onUpdate: (index: number, patch: Partial<{ durationYears: number; ratePercent: number }>) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div>
      <div className="space-y-2">
        {tiers.map((tier, i) => {
          const isLast = i === tiers.length - 1;
          return (
            <div
              key={i}
              className="flex items-end gap-2 rounded-lg border border-slate-200 p-2 bg-slate-50"
            >
              <div className="w-8 shrink-0 text-center text-xs font-semibold text-slate-400 pb-2">
                {i + 1}
              </div>
              <div className="flex-1">
                <span className="block text-[11px] text-slate-500 mb-1">
                  {isLast ? 'Remaining years' : 'Duration (yrs)'}
                </span>
                <NumberInput
                  value={isLast ? lastEffectiveDuration : tier.durationYears}
                  onChange={(n) => onUpdate(i, { durationYears: n })}
                  min={0}
                  disabled={isLast}
                />
              </div>
              <div className="flex-1">
                <span className="block text-[11px] text-slate-500 mb-1">Rate</span>
                <NumberInput
                  value={tier.ratePercent}
                  onChange={(n) => onUpdate(i, { ratePercent: n })}
                  min={0}
                  suffix="%/yr"
                />
              </div>
              <button
                onClick={() => onRemove(i)}
                disabled={tiers.length === 1}
                title="Remove tier"
                className="mb-0.5 h-9 w-9 shrink-0 rounded-lg border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
      <button
        onClick={onAdd}
        className="mt-3 text-xs font-semibold text-albarakah-600 hover:text-albarakah-700"
      >
        + Add rate tier
      </button>
    </div>
  );
}
