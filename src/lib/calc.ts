/**
 * Core domain logic for the Albarakah MCSL early-settlement rebate (Ibra') calculator.
 *
 * This module is intentionally free of any React / DOM dependency so the maths
 * can be unit-tested in isolation (see calc.test.ts).
 *
 * All amounts are in MUR. Rates are expressed as a percentage per year
 * (e.g. 5 means 5%/year).
 */

export interface RateTier {
  /** Duration of this tier, in years. Ignored for the last tier (fills to tenure). */
  durationYears: number;
  /** Profit rate for this tier, in percent per year (e.g. 5 = 5%/year). */
  ratePercent: number;
}

export type ProfitMode = 'tiers' | 'flat';

export interface CalculatorInputs {
  principal: number;
  tenureYears: number;
  tiers: RateTier[];
  profitMode: ProfitMode;
  /** Used only when profitMode === 'flat': a known total profit amount in MUR. */
  flatTotalProfit: number;
  /** Years already paid (supports decimals, e.g. 3.5). */
  yearsElapsed: number;
  /** Rebate given, as a percentage (0–100) of the remaining (unearned) profit. */
  rebatePercent: number;
}

export interface ResolvedTier extends RateTier {
  /** Start year of the tier along the tenure timeline (inclusive). */
  startYear: number;
  /** End year of the tier along the tenure timeline (exclusive upper bound). */
  endYear: number;
  /** Effective duration once clamped to the tenure. */
  effectiveDuration: number;
  /** Profit contributed by this tier over its full duration (MUR). */
  profit: number;
  /** Whether this is the implicit "remaining years" final tier. */
  isLast: boolean;
}

export interface CalculationResult {
  /** Tiers resolved with their timeline positions and per-tier profit. */
  resolvedTiers: ResolvedTier[];
  /** Total profit over the full tenure (MUR). */
  totalProfit: number;
  /** Total profit as a percentage of principal. */
  totalProfitPercentOfPrincipal: number;
  /** Years still remaining (tenure − yearsElapsed), clamped to [0, tenure]. */
  yearsRemaining: number;
  /** Remaining (unearned) profit for the years still to run (MUR). */
  remainingProfit: number;
  /** Rebate amount actually given back to the member (MUR). */
  rebateAmount: number;
  /** Rebate amount as a percentage of the principal. */
  rebatePercentOfPrincipal: number;
  /** Outstanding principal for the remaining years, straight-line (MUR). */
  outstandingPrincipal: number;
  /** Profit still payable by the member after the rebate (MUR). */
  profitStillPayable: number;
  /** Final amount the member pays to settle the account (MUR). */
  amountToSettle: number;
  /** Profit Albarakah actually earns on this financing after the rebate (MUR). */
  albarakahProfit: number;
  /** True when remaining profit is a straight-line approximation (flat mode). */
  isApproximation: boolean;
}

/** Clamp a number into an inclusive range. */
function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

/**
 * Resolve the tier list against the tenure, positioning each tier on the
 * [0, tenure] timeline. Every tier except the last has an explicit duration;
 * the last tier always fills whatever remains of the tenure.
 */
export function resolveTiers(tiers: RateTier[], tenureYears: number): ResolvedTier[] {
  const resolved: ResolvedTier[] = [];
  if (tiers.length === 0 || tenureYears <= 0) return resolved;

  let cursor = 0;
  tiers.forEach((tier, index) => {
    const isLast = index === tiers.length - 1;
    const startYear = cursor;

    let endYear: number;
    if (isLast) {
      // Last tier always extends to the end of the tenure.
      endYear = Math.max(startYear, tenureYears);
    } else {
      endYear = startYear + Math.max(0, tier.durationYears);
    }
    // Never let a tier run past the tenure.
    endYear = Math.min(endYear, tenureYears);

    const effectiveDuration = Math.max(0, endYear - startYear);
    const profit = 0; // filled in below once we know principal — see calculate()

    resolved.push({
      ...tier,
      startYear,
      endYear,
      effectiveDuration,
      profit,
      isLast,
    });

    cursor = endYear;
  });

  return resolved;
}

/**
 * Compute the profit accrued over an arbitrary window [windowStart, windowEnd]
 * of the tenure, using the tier structure. Each tier only contributes for the
 * portion of the window that overlaps its own [startYear, endYear] span — this
 * is what makes remaining years match their *original position* in the tenure
 * rather than being counted fresh from the settlement date.
 */
function profitForWindow(
  resolvedTiers: ResolvedTier[],
  principal: number,
  windowStart: number,
  windowEnd: number,
): number {
  if (windowEnd <= windowStart) return 0;
  let profit = 0;
  for (const tier of resolvedTiers) {
    const overlapStart = Math.max(windowStart, tier.startYear);
    const overlapEnd = Math.min(windowEnd, tier.endYear);
    const overlapYears = Math.max(0, overlapEnd - overlapStart);
    profit += principal * overlapYears * (tier.ratePercent / 100);
  }
  return profit;
}

/**
 * Run the full early-settlement calculation.
 */
export function calculate(inputs: CalculatorInputs): CalculationResult {
  const principal = Math.max(0, inputs.principal || 0);
  const tenureYears = Math.max(0, inputs.tenureYears || 0);
  const yearsElapsed = clamp(inputs.yearsElapsed || 0, 0, tenureYears);
  const yearsRemaining = Math.max(0, tenureYears - yearsElapsed);
  const rebatePercent = clamp(inputs.rebatePercent, 0, 100);

  const resolvedTiers = resolveTiers(inputs.tiers, tenureYears);
  // Fill in each tier's own full-duration profit for display.
  for (const tier of resolvedTiers) {
    tier.profit = principal * tier.effectiveDuration * (tier.ratePercent / 100);
  }

  const isApproximation = inputs.profitMode === 'flat';

  let totalProfit: number;
  let remainingProfit: number;

  if (isApproximation) {
    // Flat mode: a known total profit figure is entered directly; the remaining
    // (unearned) portion is estimated straight-line, proportional to the years
    // still to run. This is an approximation because it ignores the tier shape.
    totalProfit = Math.max(0, inputs.flatTotalProfit || 0);
    remainingProfit = tenureYears > 0 ? totalProfit * (yearsRemaining / tenureYears) : 0;
  } else {
    // Tier mode: exact. Total profit over the whole tenure, and the remaining
    // profit matched to the original tier positions of the remaining years.
    totalProfit = profitForWindow(resolvedTiers, principal, 0, tenureYears);
    remainingProfit = profitForWindow(resolvedTiers, principal, yearsElapsed, tenureYears);
  }

  const rebateAmount = remainingProfit * (rebatePercent / 100);
  const profitStillPayable = remainingProfit - rebateAmount;
  const outstandingPrincipal = tenureYears > 0 ? principal * (yearsRemaining / tenureYears) : 0;
  const amountToSettle = outstandingPrincipal + profitStillPayable;

  // Albarakah's profit on this financing = all profit charged minus the rebate
  // given back = earned profit + (remaining profit still payable).
  const albarakahProfit = totalProfit - rebateAmount;

  const totalProfitPercentOfPrincipal = principal > 0 ? (totalProfit / principal) * 100 : 0;
  const rebatePercentOfPrincipal = principal > 0 ? (rebateAmount / principal) * 100 : 0;

  return {
    resolvedTiers,
    totalProfit,
    totalProfitPercentOfPrincipal,
    yearsRemaining,
    remainingProfit,
    rebateAmount,
    rebatePercentOfPrincipal,
    outstandingPrincipal,
    profitStillPayable,
    amountToSettle,
    albarakahProfit,
    isApproximation,
  };
}

/** Format a MUR amount for display. */
export function formatMUR(amount: number, withSymbol = true): string {
  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
  const formatted = rounded.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return withSymbol ? `MUR ${formatted}` : formatted;
}

/** Format a percentage for display. */
export function formatPercent(value: number, digits = 2): string {
  const rounded = Math.round((value + Number.EPSILON) * 10 ** digits) / 10 ** digits;
  return `${rounded.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })}%`;
}
