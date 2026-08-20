import { useMemo, useState } from 'react';
import { formatMUR, formatPercent } from '../lib/format';
import { calculateLoan, type LoanInputs } from '../lib/loan';
import { PRODUCTS, getProduct } from '../lib/profitTable';
import { generateLoanPdf } from '../lib/loanPdf';
import { Card, Field, NumberInput, TextInput, ResultRow, inputCls } from '../components/ui';
import { Toolbar } from '../components/Toolbar';

interface FormState extends LoanInputs {
  memberName: string;
  fileId: string;
}

function makeDefaultState(): FormState {
  return {
    memberName: '',
    fileId: '',
    productId: 'HGF',
    years: 8,
    principal: 1_000_000,
    currentShares: 200_000,
    shareRatioPercent: 33.3333,
  };
}

/** Clamp a year to a product's allowed range. */
function clampYears(productId: string, years: number): number {
  const p = getProduct(productId);
  if (!p) return years;
  return Math.min(Math.max(Math.round(years), p.minYears), p.maxYears);
}

export default function LoanCalculator() {
  const [state, setState] = useState<FormState>(makeDefaultState);
  const result = useMemo(() => calculateLoan(state), [state]);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setState((s) => ({ ...s, [key]: val }));

  const product = getProduct(state.productId);
  const allowedYears = product
    ? Array.from({ length: product.maxYears - product.minYears + 1 }, (_, i) => product.minYears + i)
    : [];

  const onProductChange = (productId: string) =>
    setState((s) => ({ ...s, productId, years: clampYears(productId, s.years) }));

  const reset = () => setState(makeDefaultState());
  const downloadPdf = () =>
    generateLoanPdf({
      member: { name: state.memberName, fileId: state.fileId, product: product?.name ?? '' },
      principal: state.principal,
      years: state.years,
      currentShares: state.currentShares,
      shareRatioPercent: state.shareRatioPercent,
      result,
    });

  return (
    <>
      <Toolbar
        title="Loan Calculator"
        subtitle="Select a product and term — monthly installment, shares requirement and full schedule."
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
                <Field label="Financing product" hint={product?.note}>
                  <select
                    value={state.productId}
                    onChange={(e) => onProductChange(e.target.value)}
                    className={inputCls}
                  >
                    {['Murabahah', 'Istisnaa', 'Service Ijarah'].map((cat) => (
                      <optgroup key={cat} label={cat}>
                        {PRODUCTS.filter((p) => p.category === cat).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </Field>
                <Field label="Number of years" hint={product ? `${product.minYears}–${product.maxYears} years for this product` : undefined}>
                  <select
                    value={state.years}
                    onChange={(e) => set('years', Number(e.target.value))}
                    className={inputCls}
                  >
                    {allowedYears.map((y) => (
                      <option key={y} value={y}>
                        {y} {y === 1 ? 'year' : 'years'}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </Card>

            <Card title="Financing Details" step="2">
              <Field label="Financing amount / principal (MUR)">
                <NumberInput value={state.principal} onChange={(n) => set('principal', n)} min={0} />
              </Field>

              <div className="mt-4 rounded-lg bg-albarakah-50 border border-albarakah-100 px-4 py-3 space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium text-albarakah-700">
                    Profit rate ({formatPercent(result.benchmark)}/yr benchmark × {state.years} yr)
                  </span>
                  <span className="text-sm font-bold text-albarakah-700 tabular-nums">
                    {formatPercent(result.profitRatePercent)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-albarakah-600">Total profit</span>
                  <span className="text-[11px] font-semibold text-albarakah-600 tabular-nums">
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
            </Card>

            <Card title="Shares Requirement" step="3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Required shares (% of financing)">
                  <select
                    value={String(state.shareRatioPercent)}
                    onChange={(e) => set('shareRatioPercent', Number(e.target.value))}
                    className={inputCls}
                  >
                    <option value="33.3333">One third (33.33%)</option>
                    <option value="25">25%</option>
                  </select>
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

          {/* Results */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-32 space-y-5">
              <div className="rounded-xl bg-gradient-to-br from-albarakah-600 to-albarakah-800 text-white p-5 shadow-md">
                <p className="text-xs uppercase tracking-wide text-white/70">Monthly installment</p>
                <p className="text-4xl font-extrabold tabular-nums mt-1">
                  {formatMUR(result.monthlyPayment)}
                </p>
                <p className="text-xs text-white/80 mt-2">over {result.totalMonths} months</p>
              </div>

              <div
                className={`rounded-xl border-2 p-5 shadow-md ${
                  result.sharesMet ? 'bg-white border-albarakah-500' : 'bg-amber-50 border-amber-400'
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

              <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
                <p className="text-xs font-semibold text-slate-600 mb-2">Breakdown</p>
                <ResultRow label="Financing amount" value={formatMUR(state.principal)} />
                <ResultRow label="Benchmark rate" value={`${formatPercent(result.benchmark)}/yr`} />
                <ResultRow
                  label="Total profit"
                  value={formatMUR(result.totalProfit)}
                  sub={`${formatPercent(result.profitRatePercent)} of principal`}
                />
                <ResultRow label="Total amount payable" value={formatMUR(result.totalPayable)} />
                <ResultRow label="Number of installments" value={`${result.totalMonths} months`} />
                <ResultRow label="Monthly installment" value={formatMUR(result.monthlyPayment)} />
                <ResultRow
                  label="Total PRF (insurance) over term"
                  value={formatMUR(result.totalPrf)}
                  sub="1% of balance/yr, capped at MUR 4,000"
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
                  <th className="px-3 py-2 text-right font-semibold">PRF</th>
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
                    <td className="px-3 py-1.5 text-right text-albarakah-700">
                      {r.prf > 0 ? formatMUR(r.prf, false) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            All amounts in MUR. Equal monthly installments — principal repaid straight-line, profit
            spread evenly across the term. <span className="font-medium">PRF</span> is a yearly
            insurance premium (1% of the remaining amount to repay, capped at MUR 4,000): year 1 at
            the start, following years at each year-end. It does not affect the closing balance.
          </p>
        </Card>
      </main>
    </>
  );
}
