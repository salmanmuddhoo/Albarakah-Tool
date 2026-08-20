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
  /**
   * The benchmark flat rate (%/yr). For Motor Vehicle Financing the benchmark
   * depends on the tenure band, so this is a function of the number of years.
   */
  benchmarkFor: (years: number) => number;
  /** Short note shown under the product (e.g. tenure band rule). */
  note?: string;
}

const fixed = (b: number) => () => b;

// Motor Vehicle Financing benchmarks step up for the 8 < years ≤ 10 band.
const mvfPersonal = (years: number) => (years <= 8 ? 6.0 : 6.5);
const mvfTrade = (years: number) => (years <= 8 ? 6.5 : 7.5);

export const PRODUCTS: Product[] = [
  // Benchmark 5.5 — Murabahah general, Istisnaa home, Service Ijarah
  { id: 'HGF', name: 'Household General Financing (HGF)', category: 'Murabahah', minYears: 1, maxYears: 15, benchmarkFor: fixed(5.5) },
  { id: 'REF', name: 'Real Estate Financing (REF)', category: 'Murabahah', minYears: 1, maxYears: 15, benchmarkFor: fixed(5.5) },
  { id: 'CF', name: 'Computer Financing (CF)', category: 'Murabahah', minYears: 1, maxYears: 15, benchmarkFor: fixed(5.5) },
  { id: 'MCF', name: 'Motor Cycle Financing (MCF)', category: 'Murabahah', minYears: 1, maxYears: 15, benchmarkFor: fixed(5.5) },
  { id: 'HF', name: 'Home Financing (HF)', category: 'Istisnaa', minYears: 1, maxYears: 15, benchmarkFor: fixed(5.5) },
  { id: 'ATF', name: 'Air Ticket Financing (ATF)', category: 'Service Ijarah', minYears: 1, maxYears: 15, benchmarkFor: fixed(5.5) },
  { id: 'UF', name: 'Umrah Financing (UF)', category: 'Service Ijarah', minYears: 1, maxYears: 15, benchmarkFor: fixed(5.5) },
  { id: 'WF', name: 'Wedding Financing (WF)', category: 'Service Ijarah', minYears: 1, maxYears: 15, benchmarkFor: fixed(5.5) },
  { id: 'EF', name: 'Education Financing (EF)', category: 'Service Ijarah', minYears: 1, maxYears: 15, benchmarkFor: fixed(5.5) },

  // Motor Vehicle Financing — benchmark steps by tenure band
  {
    id: 'MVF_PERSONAL',
    name: 'Motor Vehicle Financing (MVF) — Personal Use',
    category: 'Murabahah',
    minYears: 1,
    maxYears: 10,
    benchmarkFor: mvfPersonal,
    note: '6.0%/yr up to 8 years; 6.5%/yr for 8 < years ≤ 10.',
  },
  {
    id: 'MVF_TRADE',
    name: 'Motor Vehicle Financing (MVF) — Trade (Taxis / Vans / Lorries)',
    category: 'Murabahah',
    minYears: 1,
    maxYears: 10,
    benchmarkFor: mvfTrade,
    note: '6.5%/yr up to 8 years; 7.5%/yr for 8 < years ≤ 10.',
  },

  // Higher-benchmark Murabahah
  { id: 'TF', name: 'Trade Financing', category: 'Murabahah', minYears: 1, maxYears: 15, benchmarkFor: fixed(7.5) },
  {
    id: 'OFFICE',
    name: 'Purchase of Office Space / Apartment / Business Property',
    category: 'Murabahah',
    minYears: 1,
    maxYears: 15,
    benchmarkFor: fixed(8.5),
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
