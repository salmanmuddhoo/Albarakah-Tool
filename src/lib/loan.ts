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
import { prfByMonth, totalPrf as sumPrf, type PrfYear, prfSchedule } from './prf.ts';

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
  /** Yearly PRF shown on this month (0 on months with no PRF). Informational. */
  prf: number;
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

  // PRF (yearly insurance premium)
  prfByYear: PrfYear[];
  totalPrf: number;

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
  const benchmark = product ? product.benchmark : 0;

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

  // PRF (yearly insurance premium) — informational, does not affect the balance.
  const prfByYear = prfSchedule(totalPayable, years);
  const prfMonthMap = prfByMonth(totalPayable, years);

  // Amortization schedule: equal monthly installments. The opening/closing
  // balance is the TOTAL amount remaining to repay (capital + profit), so it
  // starts at the total payable and reduces by the level installment each month.
  const schedule: ScheduleRow[] = [];
  const monthlyPrincipal = totalMonths > 0 ? principal / totalMonths : 0;
  const monthlyProfit = totalMonths > 0 ? totalProfit / totalMonths : 0;
  let balance = totalPayable;
  for (let m = 1; m <= totalMonths; m++) {
    const openingBalance = balance;
    let payment = monthlyPayment;
    if (m === totalMonths) payment = openingBalance; // absorb rounding on the last row
    let closingBalance = openingBalance - payment;
    if (Math.abs(closingBalance) < 0.005) closingBalance = 0;
    balance = closingBalance;
    schedule.push({
      month: m,
      openingBalance: round2(openingBalance),
      principalPortion: round2(monthlyPrincipal),
      profitPortion: round2(monthlyProfit),
      payment: round2(payment),
      closingBalance: round2(closingBalance),
      prf: round2(prfMonthMap.get(m) ?? 0),
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
    prfByYear,
    totalPrf: sumPrf(totalPayable, years),
    schedule,
  };
}
