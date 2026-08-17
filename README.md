# Albarakah MCSL — Islamic Finance Staff Tools

A small, standalone web app for Albarakah MCSL staff / IT Committee. It bundles
two single-purpose calculators, selectable from the top navigation:

1. **Loan Calculator** — works out a member's monthly installment, the minimum
   shares they must hold to qualify, and a full month-by-month schedule of
   payments, exportable as a PDF.
2. **Rebate tool** — calculates the early-settlement profit rebate (Ibra') owed
   when a member pays off financing ahead of schedule, exportable as a PDF
   settlement statement.

There is **no database, no member records, and no user accounts** — these are
single-purpose internal calculators. The only gate is a shared staff passcode.

Both tools share the same flat-profit tier maths (`src/lib/calc.ts`): profit is
charged on the original principal per rate tier, so the two tools stay perfectly
consistent (e.g. the loan schedule's outstanding principal at any month equals
the figure the rebate tool would quote for settling then).

## Loan Calculator

Given the financing amount, tenure, and profit-rate tiers (e.g. 7 years — first
3 years @ 5%/yr, remaining 4 years @ 3%/yr), it computes:

- **Total profit** = `principal × Σ(tier years × tier rate)`, and **total
  payable** = principal + profit.
- **Monthly installment**, with two selectable structures:
  - **Equal monthly** — one fixed installment across the whole tenure
    (`total payable ÷ months`). For the example: `1,143,000 ÷ 84 ≈ MUR 13,607.14`.
  - **Stepped by tier** — principal repaid straight-line and profit charged on
    the original principal at each month's tier rate, so the installment steps
    down when the rate drops (example: `MUR 14,464.29`/mo for months 1–36, then
    `MUR 12,964.29`/mo for months 37–84).
- **Minimum shares requirement** — to qualify, a member must hold a minimum in
  their shares account, a configurable fraction of the financing (default **one
  third**). It shows the required amount and, if the member is short, exactly
  **how much more they must add** (e.g. financing MUR 900,000 → requires
  MUR 300,000; a member holding MUR 200,000 must add MUR 100,000).
- **Full schedule of payments** — a month-by-month table (opening balance,
  principal, profit, payment, closing balance) shown on screen and in the PDF.
  PDF filename: `<File ID> - Loan Schedule.pdf`.

## Rebate tool

Given a financing's principal, tenure, and profit-rate tier structure, plus how
many years a member has already paid, it computes:

- **Total profit** over the full tenure (from the rate tiers).
- **Remaining (unearned) profit** — matched to the *original tier positions* of
  the remaining years, not a blended rate.
- **Rebate amount (Ibra')** — 100% of remaining profit by default (full Ibra',
  the norm), with an adjustable 0–100% field for partial-rebate products.
- **Outstanding principal** — straight-line, `principal × (yearsRemaining / tenure)`.
- **Amount to pay to settle the account** — the headline figure staff quote.
- **Profit made by Albarakah** on the financing after the rebate.

### Worked example (used as the default form state)

| Input | Value |
| --- | --- |
| Principal | MUR 900,000 |
| Tenure | 7 years |
| Rate tiers | Years 1–3 @ 5%/yr, Years 4–7 @ 3%/yr |
| Years paid | 3 |

Produces: total profit **MUR 243,000** (27%), remaining profit **MUR 108,000**
(the remaining 4 years fall entirely in the 3% tier — `900,000 × 4 × 3%`), full
rebate **MUR 108,000**, outstanding principal **≈ MUR 514,286**, and an amount to
settle of **≈ MUR 514,286**.

There is also a **flat total-profit** input mode: enter a known total profit
figure directly and the remaining profit is estimated straight-line
(proportional to years remaining ÷ tenure). This mode is clearly labelled as an
approximation because it ignores the tier shape.

## Tech stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [jsPDF](https://github.com/parallax/jsPDF) + jspdf-autotable for client-side
  PDF export (no reliance on `window.print()`)

## Running locally

Requires Node 20+ (Node 22 recommended — the tests use the built-in TypeScript
stripping flag).

```bash
npm install
npm run dev        # start the dev server (default http://localhost:5173)
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build locally
npm test           # run the domain-logic unit tests
```

## Changing the shared staff passcode

The passcode is read from the `VITE_STAFF_PASSCODE` environment variable at build
time. If it is not set, the app falls back to the default `albarakah`.

**Locally:** copy `.env.example` to `.env.local` and set your value:

```bash
cp .env.example .env.local
# edit .env.local:  VITE_STAFF_PASSCODE=your-new-passcode
```

**On Vercel:** set `VITE_STAFF_PASSCODE` under
_Project → Settings → Environment Variables_, then redeploy.

> Note: this is a lightweight client-side gate to keep the tool internal — it is
> not strong authentication. Because it is a Vite build-time variable, the value
> is embedded in the shipped bundle. Do not reuse a sensitive password here, and
> rely on where the app is hosted (e.g. an internal/protected Vercel deployment)
> for real access control. The passcode is remembered per browser tab session.

## Deploying to Vercel

The repo includes a `vercel.json` preconfigured for a Vite SPA.

1. Import the repository into Vercel (it auto-detects the Vite framework).
2. Add the `VITE_STAFF_PASSCODE` environment variable (optional but recommended).
3. Deploy. Build command `npm run build`, output directory `dist`.

## Project structure

```
src/
  lib/
    calc.ts        # shared tier/profit maths + rebate logic (pure, framework-free)
    calc.test.ts   # rebate unit tests (worked example + edge cases)
    loan.ts        # loan installments, amortization schedule, shares requirement
    loan.test.ts   # loan unit tests (worked example + edge cases)
    pdf.ts         # jsPDF rebate settlement-statement generator
    loanPdf.ts     # jsPDF loan schedule-of-payments generator
  components/
    PasscodeGate.tsx
    Toolbar.tsx    # per-tool title + Reset/Download actions
    ui.tsx         # shared inputs, cards, tier builder
  tools/
    LoanCalculator.tsx  # "Loan Calculator" tab
    RebateTool.tsx      # "Rebate tool" tab
  App.tsx          # shell: passcode gate, brand bar, tab navigation
  main.tsx
```

All calculation logic lives in `src/lib/calc.ts` and `src/lib/loan.ts` and is
fully unit-tested, so the domain maths can be verified independently of the UI.

## Notes / not-yet-specified behaviour

- **Insurance paid?** (rebate tool) — captured as a checkbox and shown on the
  PDF. The business rules for the "insurance not paid" case were not provided and
  are not yet applied to the calculation; wire them into `calc.ts` when supplied.
- **Installment structure** (loan tool) — both an "equal monthly" and a
  "stepped by tier" structure are provided, since the product convention wasn't
  specified. Equal monthly is the default. Switch per product as needed.
- **Shares requirement** is a percentage of the financing (default one third),
  with the required amount rounded to the nearest rupee. Adjust the percentage
  per product.
- No member data is persisted anywhere — member name and file ID are used only
  for the on-screen record and the generated PDF.
