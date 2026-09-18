/**
 * Fees associated with a financing application, from the society's
 * "General Financing Costs" table of charges.
 *
 *  - Processing / administrative fee: by financing-amount band. This one is
 *    FIXED — it is charged on every financing product and cannot be removed.
 *  - Govt. registration fee: Rs 30,000 for financing of Rs 1,000,001–1,500,000
 *    (irrespective of the tenure).
 *  - Product-specific fees: completion / notary / visit fees and an evaluation
 *    fee, depending on the financing product.
 *  - Year-1 PRF (insurance premium), payable together with the first payment.
 *
 * Every fee other than the processing fee is OPTIONAL: the officer ticks the
 * ones that apply and may edit the amount. Only ticked fees are added to the
 * total. Free-form "Others" lines can be added on top.
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

/** Stable ids for the standard (catalogue) fee lines. */
export const FEE_ID = {
  processing: 'processing',
  govtReg: 'govt-reg',
  hfVisit: 'hf-visit',
  mvfCompletion: 'mvf-completion',
  notaryAttendance: 'notary-attendance',
  notaryAssessment: 'notary-assessment',
  evaluation: 'evaluation',
  prfYear1: 'prf-year-1',
} as const;

export interface FeeLine {
  /** Stable id, used to key the officer's tick / amount overrides. */
  id: string;
  label: string;
  amount: number;
  note?: string;
  /** Fixed fees are always charged and can be neither unticked nor edited. */
  fixed?: boolean;
  /** Amount is computed from the financing, so it is not hand-editable. */
  computed?: boolean;
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
  const evaluation: FeeLine = {
    id: FEE_ID.evaluation,
    label: 'Evaluation fee',
    amount: EVALUATION_FEE,
    note: 'if conducted',
  };
  switch (feeScheme(productId)) {
    case 'hf':
      return [
        { id: FEE_ID.hfVisit, label: 'Home Financing visit fee', amount: 1_000, note: 'per visit' },
        evaluation,
      ];
    case 'mvf':
      return [
        {
          id: FEE_ID.mvfCompletion,
          label: 'Murabaha completion fee (showroom)',
          amount: 1_000,
        },
        evaluation,
      ];
    case 'ref':
      return [
        { id: FEE_ID.notaryAttendance, label: 'Attendance at Notary', amount: 1_000 },
        {
          id: FEE_ID.notaryAssessment,
          label: 'Notary assessment (title deed verification)',
          amount: 1_000,
        },
        evaluation,
      ];
    case 'office':
      return [
        {
          id: FEE_ID.notaryAssessment,
          label: 'Notary assessment (title deed verification)',
          amount: 1_000,
        },
        evaluation,
      ];
    default:
      return [];
  }
}

/**
 * The catalogue of standard fees for a product + financing amount, at their
 * default amounts. `firstYearPrf` (when > 0) appends the year-1 PRF, which is
 * payable together with the first payment.
 */
export function calculateFees(
  productId: string,
  amount: number,
  firstYearPrf = 0,
): FeesResult {
  const a = Math.max(0, amount || 0);
  const lines: FeeLine[] = [
    {
      id: FEE_ID.processing,
      label: 'Processing / administrative fee',
      amount: processingFee(a),
      fixed: true,
    },
  ];

  if (a > 1_000_000) {
    lines.push({
      id: FEE_ID.govtReg,
      label: 'Govt. registration fee',
      amount: GOVT_REG_FEE,
      note: 'financing above Rs 1,000,000',
    });
  }

  lines.push(...productFeeLines(productId));

  const prf = Math.max(0, firstYearPrf || 0);
  if (prf > 0) {
    lines.push({
      id: FEE_ID.prfYear1,
      label: 'PRF (insurance) — year 1',
      amount: prf,
      note: 'payable with the first payment',
      computed: true,
    });
  }

  const total = lines.reduce((s, l) => s + l.amount, 0);
  return { lines, total, aboveTable: a > 1_500_000 };
}

/* ------------------------------------------------------------------ *
 * Officer overrides: ticking fees on/off, editing amounts, extra lines
 * ------------------------------------------------------------------ */

/** Officer override for one catalogue fee. */
export interface FeeOverride {
  /** Ticked in / out of the total. Catalogue fees default to ticked. */
  included?: boolean;
  /** Hand-edited amount, replacing the default from the table. */
  amount?: number;
}

/** A free-form "Others" fee line typed in by the officer. */
export interface CustomFeeLine {
  id: string;
  label: string;
  amount: number;
  included: boolean;
}

export interface AppliedFeeLine extends FeeLine {
  included: boolean;
  /** True when the officer changed the amount away from the table default. */
  edited: boolean;
}

export interface AppliedFees {
  /** Every catalogue line, with the officer's tick / amount applied. */
  lines: AppliedFeeLine[];
  /** The officer's "Others" lines. */
  customLines: CustomFeeLine[];
  /** Ticked catalogue + "Others" lines, in display order. */
  includedLines: { label: string; amount: number; note?: string }[];
  /** Sum of the ticked lines only. */
  total: number;
  aboveTable: boolean;
}

export interface ApplyFeesInput {
  productId: string;
  amount: number;
  /** Year-1 PRF from the loan calculation; omit or 0 to leave it out. */
  firstYearPrf?: number;
  overrides?: Record<string, FeeOverride>;
  customLines?: CustomFeeLine[];
}

const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/**
 * Resolve the fee catalogue against the officer's ticks, amount edits and
 * "Others" lines. Only ticked lines count towards the total; the fixed
 * processing fee is always ticked at its table amount.
 */
export function applyFees(input: ApplyFeesInput): AppliedFees {
  const base = calculateFees(input.productId, input.amount, input.firstYearPrf);
  const overrides = input.overrides ?? {};

  const lines: AppliedFeeLine[] = base.lines.map((line) => {
    const o = overrides[line.id];
    const editable = !line.fixed && !line.computed;
    const amount = editable && isNum(o?.amount) ? Math.max(0, o.amount) : line.amount;
    return {
      ...line,
      amount,
      included: line.fixed ? true : o?.included ?? true,
      edited: editable && amount !== line.amount,
    };
  });

  const customLines = (input.customLines ?? []).map((c) => ({
    ...c,
    amount: isNum(c.amount) ? Math.max(0, c.amount) : 0,
  }));

  const includedLines = [
    ...lines.filter((l) => l.included).map((l) => ({ label: l.label, amount: l.amount, note: l.note })),
    ...customLines
      .filter((c) => c.included)
      .map((c) => ({ label: c.label.trim() || 'Other fee', amount: c.amount, note: undefined })),
  ];

  const total = includedLines.reduce((s, l) => s + l.amount, 0);
  return { lines, customLines, includedLines, total, aboveTable: base.aboveTable };
}
