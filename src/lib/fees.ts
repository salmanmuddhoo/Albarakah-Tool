/**
 * Fees associated with a financing application, from the society's
 * "General Financing Costs" table of charges.
 *
 *  - Processing / administrative fee: by financing-amount band.
 *  - Govt. registration fee: Rs 30,000 for financing of Rs 1,000,001–1,500,000
 *    (irrespective of the tenure).
 *  - Product-specific fees: completion / notary / visit fees and an evaluation
 *    fee, depending on the financing product.
 *
 * Some fees are conditional (per-visit, or "if conducted"); they are flagged
 * with a note but included in the indicative total.
 */

export const GOVT_REG_FEE = 30_000;
export const EVALUATION_FEE = 6_500;

/** Processing / administrative fee bands (upper bound of the band → fee). */
const PROCESSING_BANDS: { max: number; fee: number }[] = [
  { max: 50_000, fee: 500 },
  { max: 75_000, fee: 750 },
  { max: 100_000, fee: 1_000 },
  { max: 150_000, fee: 1_250 },
  { max: 200_000, fee: 1_500 },
  { max: 250_000, fee: 1_750 },
  { max: 300_000, fee: 2_000 },
  { max: 400_000, fee: 2_500 },
  { max: 500_000, fee: 2_750 },
  { max: 600_000, fee: 3_000 },
  { max: 700_000, fee: 3_500 },
  { max: 800_000, fee: 4_000 },
  { max: 900_000, fee: 4_500 },
  { max: 1_000_000, fee: 5_000 },
  { max: 1_500_000, fee: 7_500 },
];

export interface FeeLine {
  label: string;
  amount: number;
  note?: string;
}

export interface FeesResult {
  lines: FeeLine[];
  total: number;
  /** True when the financing amount is above the top band (Rs 1,500,000). */
  aboveTable: boolean;
}

/** Processing / administrative fee for a financing amount. */
export function processingFee(amount: number): number {
  const a = Math.max(0, amount || 0);
  const band = PROCESSING_BANDS.find((b) => a <= b.max);
  return band ? band.fee : PROCESSING_BANDS[PROCESSING_BANDS.length - 1].fee;
}

type FeeScheme = 'hf' | 'ref' | 'office' | 'mvf' | 'plain';

function feeScheme(productId: string): FeeScheme {
  if (productId === 'HF') return 'hf';
  if (productId === 'REF') return 'ref';
  if (productId === 'OFFICE') return 'office';
  if (productId === 'MCF' || productId.startsWith('MVF')) return 'mvf';
  return 'plain';
}

function productFeeLines(productId: string): FeeLine[] {
  switch (feeScheme(productId)) {
    case 'hf':
      return [
        { label: 'Home Financing visit fee', amount: 1_000, note: 'per visit' },
        { label: 'Evaluation fee', amount: EVALUATION_FEE, note: 'if conducted' },
      ];
    case 'mvf':
      return [
        { label: 'Murabaha completion fee (showroom)', amount: 1_000 },
        { label: 'Evaluation fee', amount: EVALUATION_FEE, note: 'if conducted' },
      ];
    case 'ref':
      return [
        { label: 'Attendance at Notary', amount: 1_000 },
        { label: 'Notary assessment (title deed verification)', amount: 1_000 },
        { label: 'Evaluation fee', amount: EVALUATION_FEE, note: 'if conducted' },
      ];
    case 'office':
      return [
        { label: 'Notary assessment (title deed verification)', amount: 1_000 },
        { label: 'Evaluation fee', amount: EVALUATION_FEE, note: 'if conducted' },
      ];
    default:
      return [];
  }
}

/** Compute the itemised fees for a product + financing amount. */
export function calculateFees(productId: string, amount: number): FeesResult {
  const a = Math.max(0, amount || 0);
  const lines: FeeLine[] = [
    { label: 'Processing / administrative fee', amount: processingFee(a) },
  ];

  if (a > 1_000_000) {
    lines.push({
      label: 'Govt. registration fee',
      amount: GOVT_REG_FEE,
      note: 'financing above Rs 1,000,000',
    });
  }

  lines.push(...productFeeLines(productId));

  const total = lines.reduce((s, l) => s + l.amount, 0);
  return { lines, total, aboveTable: a > 1_500_000 };
}
