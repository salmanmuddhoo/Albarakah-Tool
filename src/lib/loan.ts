/**
 * Domain logic for the Loan (financing) Calculator.
 *
 * Islamic-finance (e.g. Murabaha) flat-profit model, kept fully consistent with
 * the rebate tool's maths in ./calc.ts:
 *
 *   - Profit is charged on the *original principal*, per rate tier
 *     (total profit = principal × Σ(tier years × tier rate)).
 *   - Two installment structures are supported:
 *       • 'equal'   — one fixed monthly installment across the whole tenure
 *                     (total payable ÷ number of months).
 *       • 'stepped' — the principal is repaid straight-line (principal ÷ months)
 *                     and each month's profit is charged on the original
 *                     principal at that month's tier rate, so the installment
 *                     steps down when the rate tier changes. This principal
 *                     schedule matches the rebate tool's straight-line
 *                     outstanding-principal exactly.
 *
 * Shares requirement: to qualify for financing a member must hold a minimum
 * amount in their shares account — a configurable fraction of the financing
 * (default one third). We report any shortfall the member must top up.
 */
import { resolveTiers, profitForWindow, type RateTier } from './calc.ts';

export type InstallmentType = 'equal' | 'stepped';

export interface LoanInputs {
  principal: number;
  tenureYears: number;
  tiers: RateTier[];
  installmentType: InstallmentType;
  /** Amount the member currently holds in their shares account (MUR). */
  currentShares: number;
  /** Required shares as a percentage of the financing (default ≈ 33.3333). */
  shareRatioPercent: number;
}

export interface ScheduleRow {
  /** 1-based month number. */
  month: number;
  /** Annual rate (%) applied for this month. */
  ratePercent: number;
  openingBalance: number;
  principalPortion: number;
  profitPortion: number;
  payment: number;
  closingBalance: number;
}

export interface PaymentSegment {
  fromMonth: number;
  toMonth: number;
  months: number;
  ratePercent: number;
  payment: number;
}

export interface LoanResult {
  totalMonths: number;
  totalProfit: number;
  totalProfitPercentOfPrincipal: number;
  totalPayable: number;

  // Shares requirement
  requiredShares: number;
  sharesShortfall: number;
  sharesMet: boolean;

  // Payments
  schedule: ScheduleRow[];
  /** Payment amount grouped into segments of equal installment. */
  segments: PaymentSegment[];
  firstPayment: number;
  lastPayment: number;
  averageMonthlyPayment: number;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Number of whole monthly installments in the tenure (rounded to nearest month). */
export function monthsInTenure(tenureYears: number): number {
  return Math.max(0, Math.round((tenureYears || 0) * 12));
}

export function calculateLoan(inputs: LoanInputs): LoanResult {
  const principal = Math.max(0, inputs.principal || 0);
  const tenureYears = Math.max(0, inputs.tenureYears || 0);
  const totalMonths = monthsInTenure(tenureYears);
  const resolvedTiers = resolveTiers(inputs.tiers, tenureYears);

  const totalProfit = profitForWindow(resolvedTiers, principal, 0, tenureYears);
  const totalPayable = principal + totalProfit;
  const totalProfitPercentOfPrincipal = principal > 0 ? (totalProfit / principal) * 100 : 0;

  // --- Shares requirement ---
  const ratio = Math.max(0, inputs.shareRatioPercent || 0) / 100;
  // Rounded to the nearest rupee so e.g. one third of 900,000 reads as an exact
  // 300,000 rather than 299,999.70.
  const requiredShares = Math.round(principal * ratio);
  const currentShares = Math.max(0, inputs.currentShares || 0);
  const sharesShortfall = Math.max(0, round2(requiredShares - currentShares));
  const sharesMet = currentShares >= requiredShares;

  // --- Amortization schedule ---
  const schedule: ScheduleRow[] = [];
  const equalPayment = totalMonths > 0 ? totalPayable / totalMonths : 0;
  const straightLinePrincipal = totalMonths > 0 ? principal / totalMonths : 0;

  let balance = principal;
  for (let m = 1; m <= totalMonths; m++) {
    // Profit for this month, integrated over [ (m-1)/12, m/12 ] years using the
    // exact tier structure (handles fractional tier boundaries correctly).
    const windowStart = (m - 1) / 12;
    const windowEnd = m / 12;
    const profitPortion = profitForWindow(resolvedTiers, principal, windowStart, windowEnd);

    // Effective annual rate for display (profit ÷ (principal/12)).
    const ratePercent = principal > 0 ? (profitPortion / (principal / 12)) * 100 : 0;

    let payment: number;
    let principalPortion: number;
    if (inputs.installmentType === 'stepped') {
      principalPortion = straightLinePrincipal;
      payment = principalPortion + profitPortion;
    } else {
      payment = equalPayment;
      principalPortion = payment - profitPortion;
    }

    const openingBalance = balance;
    // Guard the final row against tiny floating-point residue.
    if (m === totalMonths) {
      principalPortion = openingBalance;
      if (inputs.installmentType === 'stepped') payment = principalPortion + profitPortion;
    }
    let closingBalance = openingBalance - principalPortion;
    if (Math.abs(closingBalance) < 0.005) closingBalance = 0;
    balance = closingBalance;

    schedule.push({
      month: m,
      ratePercent: round2(ratePercent),
      openingBalance: round2(openingBalance),
      principalPortion: round2(principalPortion),
      profitPortion: round2(profitPortion),
      payment: round2(payment),
      closingBalance: round2(closingBalance),
    });
  }

  // --- Group consecutive months of equal installment into segments ---
  const segments: PaymentSegment[] = [];
  for (const row of schedule) {
    const last = segments[segments.length - 1];
    if (last && Math.abs(last.payment - row.payment) < 0.005) {
      last.toMonth = row.month;
      last.months += 1;
    } else {
      segments.push({
        fromMonth: row.month,
        toMonth: row.month,
        months: 1,
        ratePercent: row.ratePercent,
        payment: row.payment,
      });
    }
  }

  const firstPayment = schedule.length ? schedule[0].payment : 0;
  const lastPayment = schedule.length ? schedule[schedule.length - 1].payment : 0;
  const averageMonthlyPayment = totalMonths > 0 ? round2(totalPayable / totalMonths) : 0;

  return {
    totalMonths,
    totalProfit,
    totalProfitPercentOfPrincipal,
    totalPayable,
    requiredShares,
    sharesShortfall,
    sharesMet,
    schedule,
    segments,
    firstPayment,
    lastPayment,
    averageMonthlyPayment,
  };
}
