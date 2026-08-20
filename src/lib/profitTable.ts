/**
 * Albarakah MCSL profit table (as at July 2024).
 *
 * The total profit rate charged on a financing depends on the product (its
 * "benchmark" flat rate per year) and the number of years of the financing.
 * The rate is NOT linear: it is the flat rate geometrically decreased for
 * tenures beyond 3 years.
 *
 *   FlatRate(n)      = benchmark × n
 *   RelativeRatio(n) = 1                for n ≤ 3
 *                    = 0.95^(n − 3)     for n > 3   (geometric decrease)
 *   ProfitRate(n)    = FlatRate(n) × RelativeRatio(n)   (percent of principal)
 *
 * This reproduces every value in the society's profit table exactly (verified
 * against all products). The formula is continuous, so it also gives a sensible
 * value for the marginal (per-year) rate used by the rebate calculation.
 */

export interface Product {
  id: string;
  /** Full display name including the product code. */
  name: string;
  /** Contract category. */
  category: 'Murabahah' | 'Istisnaa' | 'Service Ijarah';
  /** Minimum / maximum tenure in whole years for this product. */
  minYears: number;
  maxYears: number;
  /** Benchmark flat rate (%/yr) that drives the profit table for this product. */
  benchmark: number;
  /** Short note shown under the product (e.g. the vehicle-age band it covers). */
  note?: string;
}

export const PRODUCTS: Product[] = [
  // Benchmark 5.5 — Murabahah general, Istisnaa home, Service Ijarah
  { id: 'HGF', name: 'Household General Financing (HGF)', category: 'Murabahah', minYears: 1, maxYears: 15, benchmark: 5.5 },
  { id: 'REF', name: 'Real Estate Financing (REF)', category: 'Murabahah', minYears: 1, maxYears: 15, benchmark: 5.5 },
  { id: 'CF', name: 'Computer Financing (CF)', category: 'Murabahah', minYears: 1, maxYears: 15, benchmark: 5.5 },
  { id: 'MCF', name: 'Motor Cycle Financing (MCF)', category: 'Murabahah', minYears: 1, maxYears: 15, benchmark: 5.5 },
  { id: 'HF', name: 'Home Financing (HF)', category: 'Istisnaa', minYears: 1, maxYears: 15, benchmark: 5.5 },
  { id: 'ATF', name: 'Air Ticket Financing (ATF)', category: 'Service Ijarah', minYears: 1, maxYears: 15, benchmark: 5.5 },
  { id: 'UF', name: 'Umrah Financing (UF)', category: 'Service Ijarah', minYears: 1, maxYears: 15, benchmark: 5.5 },
  { id: 'WF', name: 'Wedding Financing (WF)', category: 'Service Ijarah', minYears: 1, maxYears: 15, benchmark: 5.5 },
  { id: 'EF', name: 'Education Financing (EF)', category: 'Service Ijarah', minYears: 1, maxYears: 15, benchmark: 5.5 },

  // Motor Vehicle Financing — the benchmark depends on the VEHICLE'S AGE band.
  {
    id: 'MVF_PERSONAL_LE8',
    name: 'Motor Vehicle Financing (MVF) — Personal Use (vehicle age ≤ 8 yrs)',
    category: 'Murabahah',
    minYears: 1,
    maxYears: 15,
    benchmark: 6.0,
    note: 'For a vehicle aged 8 years or less.',
  },
  {
    id: 'MVF_PERSONAL_8_10',
    name: 'Motor Vehicle Financing (MVF) — Personal Use (vehicle age 8–10 yrs)',
    category: 'Murabahah',
    minYears: 1,
    maxYears: 15,
    benchmark: 6.5,
    note: 'For a vehicle aged over 8 and up to 10 years.',
  },
  {
    id: 'MVF_TRADE_LE8',
    name: 'Motor Vehicle Financing (MVF) — Trade / Taxis, Vans, Lorries (vehicle age ≤ 8 yrs)',
    category: 'Murabahah',
    minYears: 1,
    maxYears: 15,
    benchmark: 6.5,
    note: 'For a commercial vehicle aged 8 years or less.',
  },
  {
    id: 'MVF_TRADE_8_10',
    name: 'Motor Vehicle Financing (MVF) — Trade / Taxis, Vans, Lorries (vehicle age 8–10 yrs)',
    category: 'Murabahah',
    minYears: 1,
    maxYears: 15,
    benchmark: 7.5,
    note: 'For a commercial vehicle aged over 8 and up to 10 years.',
  },

  // Higher-benchmark Murabahah
  { id: 'TF', name: 'Trade Financing', category: 'Murabahah', minYears: 1, maxYears: 15, benchmark: 7.5 },
  {
    id: 'OFFICE',
    name: 'Purchase of Office Space / Apartment / Business Property',
    category: 'Murabahah',
    minYears: 1,
    maxYears: 15,
    benchmark: 8.5,
  },
];

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

/** Geometric relative ratio for a given (possibly fractional) number of years. */
export function relativeRatio(years: number): number {
  return years <= 3 ? 1 : 0.95 ** (years - 3);
}

/** Exact (un-rounded) geometric profit rate — kept for reference/derivation. */
export function exactProfitRatePercent(benchmark: number, years: number): number {
  if (years <= 0) return 0;
  return benchmark * years * relativeRatio(years);
}

/**
 * Official total profit rate (percent of principal) for a financing of `years`
 * years, as published in the society's profit table.
 *
 * Years 1–3 (relative ratio = 1) keep the exact flat rate (benchmark × n); from
 * year 4 onwards the geometrically-decreased rate is rounded to the nearest
 * whole number (e.g. 11-year benchmark-5.5 = 40%, not 40.14%). This matches the
 * printed table exactly, and it is the rate the society actually charges.
 */
export function profitRatePercent(benchmark: number, years: number): number {
  if (years <= 0) return 0;
  const exact = exactProfitRatePercent(benchmark, years);
  return years <= 3 ? exact : Math.round(exact);
}

/**
 * Marginal profit rate (percent of principal) attributable to a single year
 * `year` of the financing — i.e. the extra profit rate for extending the term
 * from (year − 1) to `year`.
 */
export function marginalRatePercent(benchmark: number, year: number): number {
  if (year <= 0) return 0;
  return profitRatePercent(benchmark, year) - profitRatePercent(benchmark, year - 1);
}
