/**
 * PRF — a yearly insurance premium payable on the financing.
 *
 * Rule:
 *   - Charged once per year of the term, at 1% of the outstanding amount to
 *     repay, capped at a maximum of MUR 4,000 per year.
 *   - The basis for year 1 is the full amount to repay; for every following year
 *     it is the balance remaining to repay at the start of that year (i.e. the
 *     previous year's end balance).
 *   - In the monthly schedule the PRF is shown at month 1 for year 1, then at
 *     the start of each subsequent year: year K at month (K − 1)×12 (12, 24,
 *     36, …).
 *   - The PRF does NOT reduce the loan balance — it is a separate premium.
 *
 * Because the balance remaining to repay after (j−1) whole years of equal
 * installments is `totalPayable × (N − (j − 1)) / N`, the basis for year j is a
 * simple fraction of the total repayable amount.
 */

export const PRF_RATE = 0.01;
export const PRF_CAP = 4000;

export interface PrfYear {
  year: number;
  /** Amount remaining to repay used as the 1% basis for this year. */
  basis: number;
  /** PRF payable for this year (min of 1% of basis and the cap). */
  prf: number;
}

/** Per-year PRF for a financing of `years` years with `totalPayable` repayable. */
export function prfSchedule(totalPayable: number, years: number): PrfYear[] {
  const rows: PrfYear[] = [];
  const n = Math.max(0, Math.round(years));
  const tp = Math.max(0, totalPayable || 0);
  for (let j = 1; j <= n; j++) {
    const basis = n > 0 ? (tp * (n - (j - 1))) / n : 0;
    const prf = Math.min(PRF_CAP, PRF_RATE * basis);
    rows.push({ year: j, basis, prf });
  }
  return rows;
}

/** Total PRF payable over the whole term. */
export function totalPrf(totalPayable: number, years: number): number {
  return prfSchedule(totalPayable, years).reduce((s, r) => s + r.prf, 0);
}

/** Indicative PRF that should have been paid over the first `yearsPaid` years. */
export function prfDueForYears(totalPayable: number, years: number, yearsPaid: number): number {
  const k = Math.max(0, Math.min(Math.round(yearsPaid), Math.round(years)));
  return prfSchedule(totalPayable, years)
    .slice(0, k)
    .reduce((s, r) => s + r.prf, 0);
}

/** The schedule month where a given year's PRF is shown. */
export function prfMonthForYear(year: number): number {
  return year === 1 ? 1 : (year - 1) * 12;
}

/**
 * Map each year's PRF onto the month of the monthly schedule where it is shown:
 * year 1 → month 1; year K ≥ 2 → month (K − 1)×12 (start of year K).
 * Returns a map of month number → PRF amount for that month.
 */
export function prfByMonth(totalPayable: number, years: number): Map<number, number> {
  const map = new Map<number, number>();
  const rows = prfSchedule(totalPayable, years);
  rows.forEach((r) => map.set(prfMonthForYear(r.year), r.prf));
  return map;
}
