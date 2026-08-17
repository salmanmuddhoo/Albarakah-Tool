import { useMemo, useState } from 'react';
import { formatMUR, formatPercent, type RateTier } from '../lib/calc';
import { calculateLoan, type InstallmentType, type LoanInputs } from '../lib/loan';
import { generateLoanPdf } from '../lib/loanPdf';
import { Card, Field, NumberInput, TextInput, ResultRow, TierBuilder, inputCls } from '../components/ui';
import { Toolbar } from '../components/Toolbar';

interface FormState extends LoanInputs {
  memberName: string;
  fileId: string;
  product: string;
}

const PRODUCTS = [
  'Murabaha',
  'Ijarah',
  'Diminishing Musharakah',
  'Vehicle financing',
  'Home financing',
  'Other',
];

/** Fresh default state (worked example) on every call, for a clean Reset. */
function makeDefaultState(): FormState {
  return {
    memberName: '',
    fileId: '',
    product: 'Murabaha',
    principal: 900_000,
    tenureYears: 7,
    tiers: [
      { durationYears: 3, ratePercent: 5 },
      { durationYears: 4, ratePercent: 3 },
    ],
    installmentType: 'equal',
    currentShares: 200_000,
    shareRatioPercent: 33.3333,
  };
}

export default function LoanCalculator() {
  const [state, setState] = useState<FormState>(makeDefaultState);
  const result = useMemo(() => calculateLoan(state), [state]);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setState((s) => ({ ...s, [key]: val }));

  const updateTier = (index: number, patch: Partial<RateTier>) =>
    setState((s) => ({
      ...s,
      tiers: s.tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    }));
  const addTier = () =>
    setState((s) => ({ ...s, tiers: [...s.tiers, { durationYears: 1, ratePercent: 3 }] }));
  const removeTier = (index: number) =>
    setState((s) => ({
      ...s,
      tiers: s.tiers.length > 1 ? s.tiers.filter((_, i) => i !== index) : s.tiers,
    }));

  const reset = () => setState(makeDefaultState());
  const downloadPdf = () =>
    generateLoanPdf({
      member: { name: state.memberName, fileId: state.fileId, product: state.product },
      principal: state.principal,
      tenureYears: state.tenureYears,
      tiers: state.tiers,
      installmentType: state.installmentType,
      currentShares: state.currentShares,
      shareRatioPercent: state.shareRatioPercent,
      result,
    });

  const lastTierDuration = (() => {
    // Effective duration of the last tier = tenure − sum of earlier tiers.
    const earlier = state.tiers.slice(0, -1).reduce((s, t) => s + Math.max(0, t.durationYears), 0);
    return Math.max(0, state.tenureYears - earlier);
  })();

  const setInstallment = (t: InstallmentType) => set('installmentType', t);

  return (
    <>
      <Toolbar
        title="Loan Calculator"
        subtitle="Monthly installments, shares requirement and full payment schedule."
        onReset={reset}
        onDownload={downloadPdf}
        downloadLabel="Download schedule PDF"
      />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Inputs */}
          <div className="lg:col-span-3 space-y-5">
            <Card title="Member & Product" step="1">
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
                <Field label="Financing product">
                  <select
                    value={state.product}
                    onChange={(e) => set('product', e.target.value)}
                    className={inputCls}
                  >
                    {PRODUCTS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </Card>

            <Card title="Financing Details" step="2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <Field label="Financing amount / principal (MUR)">
                  <NumberInput value={state.principal} onChange={(n) => set('principal', n)} min={0} />
                </Field>
                <Field label="Tenure (years)">
                  <NumberInput
                    value={state.tenureYears}
                    onChange={(n) => set('tenureYears', n)}
                    min={0}
                    suffix="yrs"
                  />
                </Field>
              </div>

              <span className="block text-xs font-medium text-slate-600 mb-2">
                Profit rate tiers
              </span>
              <TierBuilder
                tiers={state.tiers}
                lastEffectiveDuration={lastTierDuration}
                onUpdate={updateTier}
                onAdd={addTier}
                onRemove={removeTier}
              />

              <div className="mt-4 rounded-lg bg-albarakah-50 border border-albarakah-100 px-4 py-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium text-albarakah-700">Total profit</span>
                  <span className="text-sm font-bold text-albarakah-700 tabular-nums">
                    {formatMUR(result.totalProfit)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-albarakah-600">Total amount payable</span>
                  <span className="text-[11px] font-semibold text-albarakah-600 tabular-nums">
                    {formatMUR(result.totalPayable)}
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <span className="block text-xs font-medium text-slate-600 mb-2">
                  Installment structure
                </span>
                <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50">
                  <button
                    onClick={() => setInstallment('equal')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                      state.installmentType === 'equal'
                        ? 'bg-albarakah-500 text-white'
                        : 'text-slate-600'
                    }`}
                  >
                    Equal monthly
                  </button>
                  <button
                    onClick={() => setInstallment('stepped')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                      state.installmentType === 'stepped'
                        ? 'bg-albarakah-500 text-white'
                        : 'text-slate-600'
                    }`}
                  >
                    Stepped by tier
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-slate-400">
                  {state.installmentType === 'equal'
                    ? 'One fixed installment across the whole tenure (total payable ÷ months).'
                    : 'Principal repaid straight-line; installment steps down when the rate tier changes.'}
                </p>
              </div>
            </Card>

            <Card title="Shares Requirement" step="3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Required shares (% of financing)"
                  hint="Default one third (33.3333%). Adjust per product."
                >
                  <NumberInput
                    value={state.shareRatioPercent}
                    onChange={(n) => set('shareRatioPercent', n)}
                    min={0}
                    max={100}
                    suffix="%"
                  />
                </Field>
                <Field label="Member current shares (MUR)">
                  <NumberInput
                    value={state.currentShares}
                    onChange={(n) => set('currentShares', n)}
                    min={0}
                  />
                </Field>
              </div>
            </Card>
          </div>

          {/* Results summary */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-32 space-y-5">
              {/* Monthly payment headline */}
              <div className="rounded-xl bg-gradient-to-br from-albarakah-600 to-albarakah-800 text-white p-5 shadow-md">
                <p className="text-xs uppercase tracking-wide text-white/70">Monthly payment</p>
                {result.segments.length === 1 ? (
                  <p className="text-4xl font-extrabold tabular-nums mt-1">
                    {formatMUR(result.firstPayment)}
                  </p>
                ) : (
                  <div className="mt-1 space-y-1">
                    {result.segments.map((s, i) => (
                      <div key={i} className="flex items-baseline justify-between">
                        <span className="text-xs text-white/80">
                          Months {s.fromMonth}–{s.toMonth}
                        </span>
                        <span className="text-xl font-bold tabular-nums">
                          {formatMUR(s.payment)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-white/80 mt-2">
                  over {result.totalMonths} months
                  {result.segments.length > 1 && ' · steps down by tier'}
                </p>
              </div>

              {/* Shares status */}
              <div
                className={`rounded-xl border-2 p-5 shadow-md ${
                  result.sharesMet
                    ? 'bg-white border-albarakah-500'
                    : 'bg-amber-50 border-amber-400'
                }`}
              >
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Shares requirement ({formatPercent(state.shareRatioPercent)})
                </p>
                {result.sharesMet ? (
                  <>
                    <p className="text-2xl font-bold text-albarakah-700 mt-1">✓ Requirement met</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Holds {formatMUR(state.currentShares)} of {formatMUR(result.requiredShares)}{' '}
                      required.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-slate-600 mt-1">Member must add</p>
                    <p className="text-3xl font-extrabold text-amber-600 tabular-nums">
                      {formatMUR(result.sharesShortfall)}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Needs {formatMUR(result.requiredShares)}; currently holds{' '}
                      {formatMUR(state.currentShares)}.
                    </p>
                  </>
                )}
              </div>

              {/* Breakdown */}
              <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
                <p className="text-xs font-semibold text-slate-600 mb-2">Breakdown</p>
                <ResultRow label="Financing amount" value={formatMUR(state.principal)} />
                <ResultRow
                  label="Total profit"
                  value={formatMUR(result.totalProfit)}
                  sub={`${formatPercent(result.totalProfitPercentOfPrincipal)} of principal`}
                />
                <ResultRow label="Total amount payable" value={formatMUR(result.totalPayable)} />
                <ResultRow label="Number of installments" value={`${result.totalMonths} months`} />
                <ResultRow
                  label="Average monthly payment"
                  value={formatMUR(result.averageMonthlyPayment)}
                />
              </div>

              <button
                onClick={downloadPdf}
                className="w-full rounded-xl bg-albarakah-500 py-3 text-sm font-semibold text-white hover:bg-albarakah-600 transition shadow-sm"
              >
                Download schedule PDF
              </button>
            </div>
          </div>
        </div>

        {/* Full schedule table */}
        <Card title={`Schedule of Payments (${result.totalMonths} months)`}>
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs tabular-nums">
              <thead className="sticky top-0 bg-albarakah-500 text-white">
                <tr>
                  <th className="px-3 py-2 text-center font-semibold">#</th>
                  <th className="px-3 py-2 text-right font-semibold">Opening</th>
                  <th className="px-3 py-2 text-right font-semibold">Principal</th>
                  <th className="px-3 py-2 text-right font-semibold">Profit</th>
                  <th className="px-3 py-2 text-right font-semibold">Payment</th>
                  <th className="px-3 py-2 text-right font-semibold">Closing</th>
                </tr>
              </thead>
              <tbody>
                {result.schedule.map((r) => (
                  <tr key={r.month} className="odd:bg-white even:bg-slate-50 border-t border-slate-100">
                    <td className="px-3 py-1.5 text-center text-slate-500">{r.month}</td>
                    <td className="px-3 py-1.5 text-right">{formatMUR(r.openingBalance, false)}</td>
                    <td className="px-3 py-1.5 text-right">{formatMUR(r.principalPortion, false)}</td>
                    <td className="px-3 py-1.5 text-right">{formatMUR(r.profitPortion, false)}</td>
                    <td className="px-3 py-1.5 text-right font-semibold text-slate-800">
                      {formatMUR(r.payment, false)}
                    </td>
                    <td className="px-3 py-1.5 text-right">{formatMUR(r.closingBalance, false)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            All amounts in MUR. Profit is charged on the original principal per rate tier.
          </p>
        </Card>
      </main>
    </>
  );
}
