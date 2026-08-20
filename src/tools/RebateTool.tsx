import { useMemo, useState } from 'react';
import { formatMUR, formatPercent } from '../lib/format';
import { calculateRebate, type RebateInputs } from '../lib/rebate';
import { PRODUCTS, getProduct } from '../lib/profitTable';
import { generateSettlementPdf } from '../lib/pdf';
import { Card, Field, NumberInput, TextInput, ResultRow, inputCls } from '../components/ui';
import { Toolbar } from '../components/Toolbar';

interface FormState extends RebateInputs {
  memberName: string;
  fileId: string;
  insurancePaid: boolean;
}

function makeDefaultState(): FormState {
  return {
    memberName: '',
    fileId: '',
    productId: 'HGF',
    years: 11,
    principal: 1_000_000,
    yearsPaid: 8,
    rebatePercent: 100,
    insurancePaid: true,
  };
}

function clampYears(productId: string, years: number): number {
  const p = getProduct(productId);
  if (!p) return years;
  return Math.min(Math.max(Math.round(years), p.minYears), p.maxYears);
}

/** Timeline / progress bar of years paid vs remaining. */
function Timeline({ term, paid }: { term: number; paid: number }) {
  const pct = term > 0 ? Math.min(100, Math.max(0, (paid / term) * 100)) : 0;
  const remaining = Math.max(0, term - paid);
  return (
    <div>
      <div className="flex justify-between text-[11px] text-slate-500 mb-1">
        <span>{paid} yr paid</span>
        <span>{remaining} yr remaining</span>
      </div>
      <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden flex">
        <div className="h-full bg-albarakah-500 transition-all" style={{ width: `${pct}%` }} />
        <div className="h-full bg-amber-400 transition-all" style={{ width: `${100 - pct}%` }} />
      </div>
      <div className="flex justify-between text-[11px] text-slate-400 mt-1">
        <span>Year 0</span>
        <span>Year {term}</span>
      </div>
    </div>
  );
}

export default function RebateTool() {
  const [state, setState] = useState<FormState>(makeDefaultState);
  const result = useMemo(() => calculateRebate(state), [state]);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setState((s) => ({ ...s, [key]: val }));

  const product = getProduct(state.productId);
  const allowedYears = product
    ? Array.from({ length: product.maxYears - product.minYears + 1 }, (_, i) => product.minYears + i)
    : [];
  const paidYears = Array.from({ length: state.years + 1 }, (_, i) => i); // 0..N

  const onProductChange = (productId: string) =>
    setState((s) => {
      const years = clampYears(productId, s.years);
      return { ...s, productId, years, yearsPaid: Math.min(s.yearsPaid, years) };
    });
  const onYearsChange = (years: number) =>
    setState((s) => ({ ...s, years, yearsPaid: Math.min(s.yearsPaid, years) }));

  const reset = () => setState(makeDefaultState());
  const downloadPdf = () =>
    generateSettlementPdf({
      member: { name: state.memberName, fileId: state.fileId, product: product?.name ?? '' },
      inputs: state,
      result,
      insurancePaid: state.insurancePaid,
    });

  return (
    <>
      <Toolbar
        title="Early Settlement Rebate (Ibra’)"
        subtitle="Select the product, term and years paid — the rebate is the profit for the unserved years."
        onReset={reset}
        onDownload={downloadPdf}
        downloadLabel="Download PDF"
      />

      <main className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
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
              <Field
                label="Original term (years)"
                hint={product ? `${product.minYears}–${product.maxYears} years for this product` : undefined}
              >
                <select
                  value={state.years}
                  onChange={(e) => onYearsChange(Number(e.target.value))}
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

          <Card title="Settlement Position" step="2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Principal amount (MUR)">
                <NumberInput value={state.principal} onChange={(n) => set('principal', n)} min={0} />
              </Field>
              <Field label="Years already paid">
                <select
                  value={state.yearsPaid}
                  onChange={(e) => set('yearsPaid', Number(e.target.value))}
                  className={inputCls}
                >
                  {paidYears.map((y) => (
                    <option key={y} value={y}>
                      {y} {y === 1 ? 'year' : 'years'}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Rebate given (% of unearned profit)"
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

          {/* Per-year profit rate breakdown */}
          <Card title="Per-Year Profit Rate">
            <p className="text-[11px] text-slate-500 mb-3">
              Each year carries a marginal profit rate. The society keeps the rate for the years
              served; the rebate is the profit for the unserved years.
            </p>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs tabular-nums">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Year</th>
                    <th className="px-3 py-2 text-right font-semibold">Rate</th>
                    <th className="px-3 py-2 text-right font-semibold">Profit (MUR)</th>
                    <th className="px-3 py-2 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.yearRows.map((r) => (
                    <tr
                      key={r.year}
                      className={`border-t border-slate-100 ${r.served ? '' : 'bg-amber-50'}`}
                    >
                      <td className="px-3 py-1.5 text-left text-slate-500">Year {r.year}</td>
                      <td className="px-3 py-1.5 text-right">{formatPercent(r.marginalRatePercent)}</td>
                      <td className="px-3 py-1.5 text-right">{formatMUR(r.marginalAmount, false)}</td>
                      <td className="px-3 py-1.5 text-left">
                        {r.served ? (
                          <span className="text-slate-500">Paid</span>
                        ) : (
                          <span className="text-amber-700 font-semibold">Rebated</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-32 space-y-5">
            <div className="rounded-xl bg-gradient-to-br from-albarakah-600 to-albarakah-800 text-white p-5 shadow-md">
              <p className="text-xs uppercase tracking-wide text-white/70">Rebate (Ibra’)</p>
              <p className="text-3xl font-bold tabular-nums mt-1">{formatMUR(result.rebateAmount)}</p>
              <p className="text-xs text-white/80 mt-1">
                {formatPercent(result.rebatePercentOfPrincipal)} of principal ·{' '}
                {formatPercent(result.unearnedProfitPercent)} unearned rate
              </p>
            </div>

            <div className="rounded-xl bg-white border-2 border-albarakah-500 p-5 shadow-md">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Amount to pay to settle account
              </p>
              <p className="text-4xl font-extrabold text-albarakah-700 tabular-nums mt-1">
                {formatMUR(result.amountToSettle)}
              </p>
            </div>

            <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-600 mb-3">Term progress</p>
              <Timeline term={state.years} paid={state.yearsPaid} />
            </div>

            <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-600 mb-2">Breakdown</p>
              <ResultRow label="Benchmark rate" value={`${formatPercent(result.benchmark)}/yr`} />
              <ResultRow
                label="Total profit (full term)"
                value={formatMUR(result.totalProfit)}
                sub={`${formatPercent(result.totalProfitPercent)} of principal`}
              />
              <ResultRow
                label={`Profit earned (${state.yearsPaid} yr served)`}
                value={formatMUR(result.earnedProfit)}
              />
              <ResultRow label="Unearned profit" value={formatMUR(result.unearnedProfit)} />
              <ResultRow label="Rebate amount" value={formatMUR(result.rebateAmount)} />
              <ResultRow label="Outstanding principal" value={formatMUR(result.outstandingPrincipal)} />
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
    </>
  );
}
