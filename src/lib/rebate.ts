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
import { prfDueForYears } from './prf.ts';

export interface RebateInputs {
  productId: string;
  /** Original financing term, whole years. */
  years: number;
  principal: number;
  /** Whole years already paid. */
  yearsPaid: number;
  /** Rebate given, as a percentage (0–100) of the unearned profit. */
  rebatePercent: number;
  /** PRF the member has actually paid so far (entered by the officer). */
  prfPaid: number;
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
  /** Total amount payable over the full term = principal + total profit. */
  totalPayable: number;

  earnedProfitPercent: number;
  earnedProfit: number;

  /** Unearned profit = profit for the unserved years (rebate-eligible). */
  unearnedProfitPercent: number;
  unearnedProfit: number;

  rebateAmount: number;
  rebatePercentOfPrincipal: number;

  // Amount already paid (equal monthly installments)
  monthlyInstallment: number;
  monthsPaid: number;
  totalPaid: number;
  capitalPaid: number;
  profitPaid: number;
  /** Total remaining to repay before the rebate (total payable − total paid). */
  remainingBalance: number;

  profitStillPayable: number;
  /** Remaining (unpaid) capital. */
  outstandingPrincipal: number;
  /** Total outstanding = outstanding capital + profit still payable after rebate. */
  totalOutstanding: number;

  // PRF (yearly insurance premium)
  /** Indicative PRF that should have been paid for the years served. */
  prfDue: number;
  /** PRF the member actually paid (officer input). */
  prfPaid: number;
  /** Outstanding PRF still owed (added to the settlement). */
  prfOutstanding: number;

  /** What the member would pay to settle WITHOUT the rebate (balance + PRF). */
  settleBeforeRebate: number;
  /** Final amount to settle = settleBeforeRebate − rebate. */
  amountToSettle: number;
  /** Net rebate benefit to the member after any outstanding PRF is deducted. */
  netRebate: number;
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

  // Equal monthly installments already paid. Because the installment is level,
  // the member has paid capital and profit at the average (straight-line) rate.
  const totalPayable = principal + totalProfit;
  const totalMonths = Math.max(0, years * 12);
  const monthsPaid = yearsPaid * 12;
  const monthlyInstallment = totalMonths > 0 ? totalPayable / totalMonths : 0;
  const totalPaid = monthlyInstallment * monthsPaid;
  const capitalPaid = years > 0 ? principal * (yearsPaid / years) : 0;
  const profitPaid = years > 0 ? totalProfit * (yearsPaid / years) : 0;
  const remainingBalance = totalPayable - totalPaid;

  // Remaining (unpaid) capital, and the profit still owed after the rebate.
  const outstandingPrincipal = principal - capitalPaid;
  const remainingProfitUnpaid = totalProfit - profitPaid;
  const profitStillPayable = Math.max(0, remainingProfitUnpaid - rebateAmount);
  const totalOutstanding = outstandingPrincipal + profitStillPayable;

  // PRF: the member must be up to date on PRF for the years served to receive
  // the rebate. Any shortfall is added to the amount to settle.
  const prfDue = prfDueForYears(totalPayable, years, yearsPaid);
  const prfPaid = Math.max(0, inputs.prfPaid || 0);
  const prfOutstanding = Math.max(0, prfDue - prfPaid);

  // Settlement: the member owes the full remaining balance plus any outstanding
  // PRF, and the rebate (Ibra') is deducted from that — the member does not
  // receive the rebate in cash, they pay that much less to settle.
  const settleBeforeRebate = remainingBalance + prfOutstanding;
  const amountToSettle = Math.max(0, settleBeforeRebate - rebateAmount);
  const netRebate = rebateAmount - prfOutstanding;
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
    totalPayable,
    earnedProfitPercent,
    earnedProfit,
    unearnedProfitPercent,
    unearnedProfit,
    rebateAmount,
    rebatePercentOfPrincipal,
    monthlyInstallment,
    monthsPaid,
    totalPaid,
    capitalPaid,
    profitPaid,
    remainingBalance,
    profitStillPayable,
    outstandingPrincipal,
    totalOutstanding,
    prfDue,
    prfPaid,
    prfOutstanding,
    settleBeforeRebate,
    amountToSettle,
    netRebate,
    albarakahProfit,
    yearRows,
  };
}
