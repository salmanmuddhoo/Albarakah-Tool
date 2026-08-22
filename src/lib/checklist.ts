/**
 * Loan-application document checklists, derived from the society's official
 * "Documents required when applying for Shari'ah-Compliant Financing" forms
 * (HGF/HF and MVF/MCF/REF, 2024).
 *
 * The checklist shown for an application is built from three parts:
 *   1. Common documents (all schemes).
 *   2. Income / affordability documents — which depend on the APPLICANT TYPE
 *      (salaried, self-employed, pensioner, …).
 *   3. Product-specific documents (per financing product).
 *   4. Sureties / guarantors (all schemes).
 *
 * The lists are a faithful, condensed version of the official forms and are
 * meant to be refined further as the society updates them.
 */
import { getProduct } from './profitTable.ts';

export type ApplicantType = 'salaried' | 'self_employed' | 'pensioner' | 'other';

export const APPLICANT_TYPES: { id: ApplicantType; label: string }[] = [
  { id: 'salaried', label: 'Salaried person' },
  { id: 'self_employed', label: 'Self-Employed' },
  { id: 'pensioner', label: 'Pensioner' },
  { id: 'other', label: 'Other' },
];

export function applicantTypeLabel(id: ApplicantType): string {
  return APPLICANT_TYPES.find((a) => a.id === id)?.label ?? 'Applicant';
}

export interface ChecklistSection {
  title: string;
  items: string[];
}

const COMMON_DOCS: string[] = [
  'National Identity Card (copy)',
  'Birth Certificate (and Marriage Certificate if married civilly)',
  'Proof of Address (utility bill, within 3 months)',
  'Proof of membership / Shares (MSA or HSA) — to be combined and frozen',
  'Completed & signed SCF Application Form',
];

const INCOME_DOCS: Record<ApplicantType, string[]> = {
  salaried: [
    'Recent pay slips (last 3 months)',
    'Employment / salary certificate from employer',
    'Bank statements (last 3 months)',
  ],
  self_employed: [
    'Business Registration (BRN) / Trade Licence',
    'Statement of income / financial statements',
    'Bank statements (last 6 months)',
    'Evidence of business activity',
  ],
  pensioner: [
    'Pension statement / pension slip',
    'Bank statements (last 3 months)',
  ],
  other: ['Statement of income / proof of income', 'Bank statements (last 3 months)'],
};

const SURETY_DOCS: string[] = [
  'Sureties / Guarantors (Kafeel) are compliant members conforming to the rules',
  'Sureties physically present to sign Suretyship (shares & accounts frozen until settlement)',
  'Pay slip / statement of income of at least one surety',
  'Confirm no surety is acting as surety for another debtor',
];

/** Product-specific documents, keyed by an internal scheme group. */
type Scheme = 'hgf' | 'hf' | 'mvf' | 'ref' | 'other';

const PRODUCT_DOCS: Record<Scheme, { title: string; items: string[] }> = {
  hgf: {
    title: 'Household General Financing (HGF)',
    items: [
      'Quotation from Supplier / Seller (to be cross-checked)',
      'For inscription of Fixed / Floating charge: ID + Birth + Marriage Certificate (recent 3 months)',
      'For Floating charge: list of assets to be charged, with receipts / evidence (to be frozen)',
    ],
  },
  hf: {
    title: 'Home Financing (HF) — Istisnaa',
    items: [
      'Quotation from Contractor / Seller / Supplier + list of construction / renovation works',
      'Authorisation from parents / heirs / spouse for construction (if any, registered)',
      'Construction plan + Building Permit from the authorities',
      'Title Deed (own or third party)',
      'Evaluation report of the land / building; check any existing Fixed charge / lien',
      'For Istisna: BRN / Permit + quotation of contractor / supplier (both parties present to sign)',
    ],
  },
  mvf: {
    title: 'Motor Vehicle / Cycle Financing (MVF / MCF)',
    items: [
      'Expression of interest to sell / quotation from Owner / Dealer / Showroom',
      'Vehicle aged not more than 10 years; Valuation Certificate if purchased from an individual',
      'If for commercial use: NLTA / authority documents + contract / letter from employer or institution',
      'Applicant to declare in whose name the vehicle will be registered',
      'Collateral: original Registration Book (HP) for lien; Floating charge kept in abeyance meanwhile',
    ],
  },
  ref: {
    title: 'Real Estate Financing (REF)',
    items: [
      'Letter of intent / quotation to sell the plot from Owner / Real Estate Developer',
      'Copy of Title Deed (Contra Terrain), PIN Certificate (if any)',
      'Applicant to declare in whose name the plot will be registered',
      'Birth + Marriage Certificate (if married civilly) for inscription of Fixed charge',
      'Notary to email the Society a week in advance; banker’s cheque issued in the Notary’s name',
      'Collateral: Floating charge pending submission of registered Title Deed for Fixed charge',
    ],
  },
  other: {
    title: 'Product-specific documents',
    items: [
      'Quotation / proforma invoice from the supplier / seller (to be cross-checked)',
      'Product-specific documents to be confirmed with Head Office for this scheme',
    ],
  },
};

function schemeForProduct(productId: string): Scheme {
  if (productId === 'HGF') return 'hgf';
  if (productId === 'HF') return 'hf';
  if (productId === 'REF') return 'ref';
  if (productId === 'MCF' || productId.startsWith('MVF')) return 'mvf';
  return 'other';
}

/** Build the full, sectioned checklist for a product + applicant type. */
export function buildChecklist(productId: string, applicantType: ApplicantType): ChecklistSection[] {
  const scheme = schemeForProduct(productId);
  const product = getProduct(productId);
  const productDocs = PRODUCT_DOCS[scheme];

  return [
    { title: 'Common documents', items: COMMON_DOCS },
    { title: `Income documents — ${applicantTypeLabel(applicantType)}`, items: INCOME_DOCS[applicantType] },
    {
      title: product ? `Product documents — ${product.name}` : productDocs.title,
      items: productDocs.items,
    },
    { title: 'Sureties / Guarantors', items: SURETY_DOCS },
  ];
}
