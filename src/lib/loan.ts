/**
 * Loan / financing calculator under the profit-table model.
 *
 * The profit is a flat markup on the principal, looked up from the profit table
 * by product and number of years:
 *
 *   totalProfit  = principal × ProfitRate(product, years) / 100
 *   totalPayable = principal + totalProfit
 *   monthly      = totalPayable / (years × 12)   (equal installments)
 *
 * The amortization schedule repays principal straight-line and spreads the
 * profit evenly across the installments (standard flat Murabaha installment).
 *
 * Shares requirement: to qualify, a member must hold a minimum in their shares
 * account — a configurable fraction of the financing (default one third).
 */
import { getProduct, profitRatePercent } from './profitTable.ts';

export interface LoanInputs {
  productId: string;
  /** Financing term, whole years. */
  years: number;
  principal: number;
  /** Amount the member currently holds in their shares account (MUR). */
  currentShares: number;
  /** Required shares as a percentage of the financing (default ≈ 33.3333). */
  shareRatioPercent: number;
}

export interface ScheduleRow {
  month: number;
  openingBalance: number;
  principalPortion: number;
  profitPortion: number;
  payment: number;
  closingBalance: number;
}

export interface LoanResult {
  benchmark: number;
  totalMonths: number;
  profitRatePercent: number;
  totalProfit: number;
  totalPayable: number;

  monthlyPayment: number;

  // Shares requirement
  requiredShares: number;
  sharesShortfall: number;
  sharesMet: boolean;

  schedule: ScheduleRow[];
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function monthsInTenure(years: number): number {
  return Math.max(0, Math.round((years || 0) * 12));
}

export function calculateLoan(inputs: LoanInputs): LoanResult {
  const product = getProduct(inputs.productId);
  const principal = Math.max(0, inputs.principal || 0);
  const years = Math.max(0, Math.round(inputs.years || 0));
  const totalMonths = monthsInTenure(years);
  const benchmark = product ? product.benchmarkFor(years) : 0;

  const ratePercent = profitRatePercent(benchmark, years);
  const totalProfit = (principal * ratePercent) / 100;
  const totalPayable = principal + totalProfit;
  const monthlyPayment = totalMonths > 0 ? totalPayable / totalMonths : 0;

  // Shares requirement (rounded to the nearest rupee).
  const ratio = Math.max(0, inputs.shareRatioPercent || 0) / 100;
  const requiredShares = Math.round(principal * ratio);
  const currentShares = Math.max(0, inputs.currentShares || 0);
  const sharesShortfall = Math.max(0, round2(requiredShares - currentShares));
  const sharesMet = currentShares >= requiredShares;

  // Amortization schedule: straight-line principal + even profit split.
  const schedule: ScheduleRow[] = [];
  const monthlyPrincipal = totalMonths > 0 ? principal / totalMonths : 0;
  const monthlyProfit = totalMonths > 0 ? totalProfit / totalMonths : 0;
  let balance = principal;
  for (let m = 1; m <= totalMonths; m++) {
    const openingBalance = balance;
    let principalPortion = monthlyPrincipal;
    if (m === totalMonths) principalPortion = openingBalance; // absorb rounding
    let closingBalance = openingBalance - principalPortion;
    if (Math.abs(closingBalance) < 0.005) closingBalance = 0;
    balance = closingBalance;
    schedule.push({
      month: m,
      openingBalance: round2(openingBalance),
      principalPortion: round2(principalPortion),
      profitPortion: round2(monthlyProfit),
      payment: round2(principalPortion + monthlyProfit),
      closingBalance: round2(closingBalance),
    });
  }

  return {
    benchmark,
    totalMonths,
    profitRatePercent: ratePercent,
    totalProfit,
    totalPayable,
    monthlyPayment,
    requiredShares,
    sharesShortfall,
    sharesMet,
    schedule,
  };
}
