/**
 * Early-settlement rebate (Ibra') calculation under the profit-table model.
 *
 * The profit charged for a full N-year financing is principal × ProfitRate(N).
 * When a member settles after paying k whole years, the society keeps the
 * profit for the years actually served — the sum of the marginal per-year rates
 * for years 1..k, which equals ProfitRate(k). The rebate given back is the
 * profit for the unserved years (k+1..N) = ProfitRate(N) − ProfitRate(k).
 *
 * An adjustable "rebate given" percentage (default 100% — full Ibra') is applied
 * to that unearned profit in case a product grants only a partial rebate.
 */
import { getProduct, profitRatePercent, marginalRatePercent } from './profitTable.ts';

export interface RebateInputs {
  productId: string;
  /** Original financing term, whole years. */
  years: number;
  principal: number;
  /** Whole years already paid. */
  yearsPaid: number;
  /** Rebate given, as a percentage (0–100) of the unearned profit. */
  rebatePercent: number;
}

export interface YearRow {
  year: number;
  marginalRatePercent: number;
  marginalAmount: number;
  served: boolean;
}

export interface RebateResult {
  benchmark: number;
  yearsRemaining: number;

  totalProfitPercent: number;
  totalProfit: number;

  earnedProfitPercent: number;
  earnedProfit: number;

  /** Unearned profit = profit for the unserved years (rebate-eligible). */
  unearnedProfitPercent: number;
  unearnedProfit: number;

  rebateAmount: number;
  rebatePercentOfPrincipal: number;

  profitStillPayable: number;
  outstandingPrincipal: number;
  amountToSettle: number;
  albarakahProfit: number;

  /** Per-year marginal-rate breakdown for display. */
  yearRows: YearRow[];
}

const clamp = (v: number, min: number, max: number) =>
  Number.isNaN(v) ? min : Math.min(Math.max(v, min), max);

export function calculateRebate(inputs: RebateInputs): RebateResult {
  const product = getProduct(inputs.productId);
  const principal = Math.max(0, inputs.principal || 0);
  const years = Math.max(0, Math.round(inputs.years || 0));
  const yearsPaid = clamp(Math.round(inputs.yearsPaid || 0), 0, years);
  const yearsRemaining = Math.max(0, years - yearsPaid);
  const rebatePercent = clamp(inputs.rebatePercent, 0, 100);
  const benchmark = product ? product.benchmark : 0;

  const totalProfitPercent = profitRatePercent(benchmark, years);
  const earnedProfitPercent = profitRatePercent(benchmark, yearsPaid);
  const unearnedProfitPercent = Math.max(0, totalProfitPercent - earnedProfitPercent);

  const totalProfit = (principal * totalProfitPercent) / 100;
  const earnedProfit = (principal * earnedProfitPercent) / 100;
  const unearnedProfit = (principal * unearnedProfitPercent) / 100;

  const rebateAmount = unearnedProfit * (rebatePercent / 100);
  const rebatePercentOfPrincipal = principal > 0 ? (rebateAmount / principal) * 100 : 0;
  const profitStillPayable = unearnedProfit - rebateAmount;

  const outstandingPrincipal = years > 0 ? principal * (yearsRemaining / years) : 0;
  const amountToSettle = outstandingPrincipal + profitStillPayable;
  const albarakahProfit = totalProfit - rebateAmount;

  const yearRows: YearRow[] = [];
  for (let y = 1; y <= years; y++) {
    const rate = marginalRatePercent(benchmark, y);
    yearRows.push({
      year: y,
      marginalRatePercent: rate,
      marginalAmount: (principal * rate) / 100,
      served: y <= yearsPaid,
    });
  }

  return {
    benchmark,
    yearsRemaining,
    totalProfitPercent,
    totalProfit,
    earnedProfitPercent,
    earnedProfit,
    unearnedProfitPercent,
    unearnedProfit,
    rebateAmount,
    rebatePercentOfPrincipal,
    profitStillPayable,
    outstandingPrincipal,
    amountToSettle,
    albarakahProfit,
    yearRows,
  };
}
