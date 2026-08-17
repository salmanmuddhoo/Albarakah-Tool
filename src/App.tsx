import { useMemo, useState } from 'react';
import PasscodeGate from './components/PasscodeGate';
import {
  calculate,
  formatMUR,
  formatPercent,
  type CalculatorInputs,
  type RateTier,
} from './lib/calc';
import { generateSettlementPdf } from './lib/pdf';

// ---------------------------------------------------------------------------
// Default state — reuses the worked example from the spec.
// ---------------------------------------------------------------------------
interface FormState extends CalculatorInputs {
  memberName: string;
  fileId: string;
  insurancePaid: boolean;
}

/**
 * Returns a fresh copy of the default (worked-example) state on every call, so
 * Reset always yields a brand-new object with independent nested arrays — no
 * shared references that could be mutated or cause a setState bail-out.
 */
function makeDefaultState(): FormState {
  return {
    memberName: '',
    fileId: '',
    principal: 900_000,
    tenureYears: 7,
    tiers: [
      { durationYears: 3, ratePercent: 5 },
      { durationYears: 4, ratePercent: 3 },
    ],
    profitMode: 'tiers',
    flatTotalProfit: 243_000,
    yearsElapsed: 3,
    rebatePercent: 100,
    insurancePaid: true,
  };
}

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------
function Card({
  title,
  children,
  step,
}: {
  title: string;
  children: React.ReactNode;
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

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
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

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-albarakah-500 focus:border-albarakah-500';

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ''}`} />;
}

/** Numeric input that keeps an empty string editable but reports a number. */
function NumberInput({
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

function ResultRow({
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

// ---------------------------------------------------------------------------
// Timeline / progress bar
// ---------------------------------------------------------------------------
function Timeline({
  tenure,
  paid,
}: {
  tenure: number;
  paid: number;
}) {
  const pct = tenure > 0 ? Math.min(100, Math.max(0, (paid / tenure) * 100)) : 0;
  const remaining = Math.max(0, tenure - paid);
  return (
    <div>
      <div className="flex justify-between text-[11px] text-slate-500 mb-1">
        <span>{paid} yr paid</span>
        <span>{remaining} yr remaining</span>
      </div>
      <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden flex">
        <div
          className="h-full bg-albarakah-500 transition-all"
          style={{ width: `${pct}%` }}
        />
        <div
          className="h-full bg-amber-400 transition-all"
          style={{ width: `${100 - pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[11px] text-slate-400 mt-1">
        <span>Year 0</span>
        <span>Year {tenure}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main calculator
// ---------------------------------------------------------------------------
function Calculator() {
  const [state, setState] = useState<FormState>(makeDefaultState);

  const result = useMemo(() => calculate(state), [state]);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setState((s) => ({ ...s, [key]: val }));

  // --- Tier editing helpers ---
  const updateTier = (index: number, patch: Partial<RateTier>) =>
    setState((s) => ({
      ...s,
      tiers: s.tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    }));

  const addTier = () =>
    setState((s) => ({
      ...s,
      tiers: [...s.tiers, { durationYears: 1, ratePercent: 3 }],
    }));

  const removeTier = (index: number) =>
    setState((s) => ({
      ...s,
      tiers: s.tiers.length > 1 ? s.tiers.filter((_, i) => i !== index) : s.tiers,
    }));

  const reset = () => setState(makeDefaultState());

  const downloadPdf = () =>
    generateSettlementPdf({
      member: { name: state.memberName, fileId: state.fileId },
      inputs: state,
      result,
      insurancePaid: state.insurancePaid,
    });

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-albarakah-500 text-white">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-white/15 flex items-center justify-center font-bold">
              A
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">Albarakah MCSL</h1>
              <p className="text-xs text-white/80">Early Settlement Rebate (Ibra’) Calculator</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={reset}
              className="rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold hover:bg-white/25 transition"
            >
              Reset
            </button>
            <button
              onClick={downloadPdf}
              className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-albarakah-700 hover:bg-slate-100 transition"
            >
              Download PDF
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ---- Inputs (left, 3 cols) ---- */}
        <div className="lg:col-span-3 space-y-5">
          {/* 1. Member details */}
          <Card title="Member Details" step="1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Member name" hint="For the statement only — not stored.">
                <TextInput
                  value={state.memberName}
                  onChange={(e) => set('memberName', e.target.value)}
                  placeholder="e.g. Ahmed Patel"
                />
              </Field>
              <Field label="Membership / File ID">
                <TextInput
                  value={state.fileId}
                  onChange={(e) => set('fileId', e.target.value)}
                  placeholder="e.g. AB0001"
                />
              </Field>
            </div>
          </Card>

          {/* 2. Financing details */}
          <Card title="Financing Details" step="2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <Field label="Principal amount (MUR)">
                <NumberInput
                  value={state.principal}
                  onChange={(n) => set('principal', n)}
                  min={0}
                />
              </Field>
              <Field label="Original tenure (years)">
                <NumberInput
                  value={state.tenureYears}
                  onChange={(n) => set('tenureYears', n)}
                  min={0}
                  suffix="yrs"
                />
              </Field>
            </div>

            {/* Profit input mode toggle */}
            <div className="mb-4 inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50">
              <button
                onClick={() => set('profitMode', 'tiers')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                  state.profitMode === 'tiers'
                    ? 'bg-albarakah-500 text-white'
                    : 'text-slate-600'
                }`}
              >
                Rate tiers
              </button>
              <button
                onClick={() => set('profitMode', 'flat')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                  state.profitMode === 'flat'
                    ? 'bg-albarakah-500 text-white'
                    : 'text-slate-600'
                }`}
              >
                Flat total profit
              </button>
            </div>

            {state.profitMode === 'tiers' ? (
              <div>
                <div className="space-y-2">
                  {state.tiers.map((tier, i) => {
                    const isLast = i === state.tiers.length - 1;
                    const resolved = result.resolvedTiers[i];
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
                            value={isLast ? resolved?.effectiveDuration ?? 0 : tier.durationYears}
                            onChange={(n) => updateTier(i, { durationYears: n })}
                            min={0}
                            disabled={isLast}
                          />
                        </div>
                        <div className="flex-1">
                          <span className="block text-[11px] text-slate-500 mb-1">Rate</span>
                          <NumberInput
                            value={tier.ratePercent}
                            onChange={(n) => updateTier(i, { ratePercent: n })}
                            min={0}
                            suffix="%/yr"
                          />
                        </div>
                        <button
                          onClick={() => removeTier(i)}
                          disabled={state.tiers.length === 1}
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
                  onClick={addTier}
                  className="mt-3 text-xs font-semibold text-albarakah-600 hover:text-albarakah-700"
                >
                  + Add rate tier
                </button>

                <div className="mt-4 rounded-lg bg-albarakah-50 border border-albarakah-100 px-4 py-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-medium text-albarakah-700">
                      Total profit over tenure
                    </span>
                    <span className="text-sm font-bold text-albarakah-700 tabular-nums">
                      {formatMUR(result.totalProfit)}
                    </span>
                  </div>
                  <div className="text-[11px] text-albarakah-600 text-right">
                    {formatPercent(result.totalProfitPercentOfPrincipal)} of principal
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <Field
                  label="Total profit amount (MUR)"
                  hint="Bypasses the tier builder. Remaining profit is estimated straight-line."
                >
                  <NumberInput
                    value={state.flatTotalProfit}
                    onChange={(n) => set('flatTotalProfit', n)}
                    min={0}
                  />
                </Field>
                <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-[11px] text-amber-700">
                  ⚠ Approximation mode: remaining profit is prorated by years
                  remaining ÷ tenure and ignores the actual tier shape.
                </div>
              </div>
            )}
          </Card>

          {/* 3. Settlement position */}
          <Card title="Settlement Position" step="3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Years already paid" hint="Supports decimals, e.g. 3.5">
                <NumberInput
                  value={state.yearsElapsed}
                  onChange={(n) => set('yearsElapsed', n)}
                  min={0}
                  max={state.tenureYears}
                  suffix="yrs"
                />
              </Field>
              <Field
                label="Rebate given (% of remaining profit)"
                hint="Default 100% — full Ibra’. Lower only for a partial-rebate product."
              >
                <NumberInput
                  value={state.rebatePercent}
                  onChange={(n) => set('rebatePercent', n)}
                  min={0}
                  max={100}
                  suffix="%"
                />
              </Field>
            </div>

            <label className="mt-4 flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={state.insurancePaid}
                onChange={(e) => set('insurancePaid', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-albarakah-500 focus:ring-albarakah-500"
              />
              <span className="text-sm text-slate-700">Insurance paid?</span>
              <span className="text-[11px] text-slate-400">
                (if no, rules will be provided later)
              </span>
            </label>
          </Card>
        </div>

        {/* ---- Results (right, 2 cols) ---- */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-6 space-y-5">
            {/* Headline rebate */}
            <div className="rounded-xl bg-gradient-to-br from-albarakah-600 to-albarakah-800 text-white p-5 shadow-md">
              <p className="text-xs uppercase tracking-wide text-white/70">Rebate (Ibra’)</p>
              <p className="text-3xl font-bold tabular-nums mt-1">
                {formatMUR(result.rebateAmount)}
              </p>
              <p className="text-xs text-white/80 mt-1">
                {formatPercent(result.rebatePercentOfPrincipal)} of principal ·{' '}
                {formatPercent(state.rebatePercent)} of remaining profit
              </p>
            </div>

            {/* Amount to settle — most prominent */}
            <div className="rounded-xl bg-white border-2 border-albarakah-500 p-5 shadow-md">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Amount to pay to settle account
              </p>
              <p className="text-4xl font-extrabold text-albarakah-700 tabular-nums mt-1">
                {formatMUR(result.amountToSettle)}
              </p>
              {result.isApproximation && (
                <p className="text-[11px] text-amber-600 mt-2">
                  ⚠ Based on a straight-line approximation of remaining profit.
                </p>
              )}
            </div>

            {/* Timeline */}
            <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-600 mb-3">Tenure progress</p>
              <Timeline tenure={state.tenureYears} paid={state.yearsElapsed} />
            </div>

            {/* Breakdown */}
            <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-600 mb-2">Breakdown</p>
              <ResultRow label="Years remaining" value={`${result.yearsRemaining} yrs`} />
              <ResultRow
                label={
                  result.isApproximation
                    ? 'Remaining profit (est.)'
                    : 'Remaining (unearned) profit'
                }
                value={formatMUR(result.remainingProfit)}
              />
              <ResultRow label="Rebate amount" value={formatMUR(result.rebateAmount)} />
              <ResultRow
                label="Outstanding principal"
                value={formatMUR(result.outstandingPrincipal)}
              />
              <ResultRow
                label="Profit still payable after rebate"
                value={formatMUR(result.profitStillPayable)}
              />
              <ResultRow
                label="Profit made by Albarakah"
                value={formatMUR(result.albarakahProfit)}
                sub="total profit − rebate given"
              />
            </div>

            <button
              onClick={downloadPdf}
              className="w-full rounded-xl bg-albarakah-500 py-3 text-sm font-semibold text-white hover:bg-albarakah-600 transition shadow-sm"
            >
              Download PDF statement
            </button>
          </div>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-4 py-6 text-center text-[11px] text-slate-400">
        Albarakah MCSL — internal staff tool. No member data is stored.
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <PasscodeGate>
      <Calculator />
    </PasscodeGate>
  );
}
