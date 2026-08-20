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
