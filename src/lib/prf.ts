/**
 * PRF — a yearly insurance premium payable on the financing.
 *
 * Rule:
 *   - Charged once per year of the term, at 1% of the outstanding amount to
 *     repay, capped at a maximum of MUR 4,000 per year.
 *   - Year 1 is measured at the START of the financing (on the full amount to
 *     repay). Every following year is measured at the END of the previous year
 *     cycle (on the balance remaining to repay at that point).
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

/**
 * Map each year's PRF onto the month of the monthly schedule where it is shown:
 * year 1 → month 1 (beginning); year j ≥ 2 → month (j−1)×12 (end of year j−1).
 * Returns a map of month number → PRF amount for that month.
 */
export function prfByMonth(totalPayable: number, years: number): Map<number, number> {
  const map = new Map<number, number>();
  const rows = prfSchedule(totalPayable, years);
  rows.forEach((r) => {
    const month = r.year === 1 ? 1 : (r.year - 1) * 12;
    map.set(month, r.prf);
  });
  return map;
}
