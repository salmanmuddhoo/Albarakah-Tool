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

## The profit table (core model)

Both tools are driven by the society's profit table (`src/lib/profitTable.ts`).
The total profit rate charged on a financing depends on the **product** (its
benchmark flat rate per year) and the **number of years**, and is **not linear** —
the flat rate is geometrically reduced for tenures beyond 3 years:

```
FlatRate(n)      = benchmark × n
RelativeRatio(n) = 1                for n ≤ 3
                 = 0.95^(n − 3)     for n > 3     (geometric decrease)
ProfitRate(n)    = FlatRate(n) × RelativeRatio(n)   (percent of principal)
```

This reproduces every value in the society's July-2024 profit table exactly
(verified against all products in `profitTable.test.ts`). Examples: group‑1
benchmark 5.5 → 8 years = **34.05%**, 11 years = **40.14%**; MVF 8<Yrs≤10
benchmark 6.5 → 10 years = **45.39%**.

### Products and benchmarks

| Benchmark | Products | Years |
| --- | --- | --- |
| 5.5% | Murabahah HGF / REF / CF / MCF · Istisnaa HF · Service Ijarah ATF / UF / WF / EF | 1–15 |
| 6.0% → 6.5% | Murabahah MVF — Personal Use (6.0% ≤8 yrs; 6.5% for 8<yrs≤10) | 1–10 |
| 6.5% → 7.5% | Murabahah MVF — Trade / Taxis, Vans, Lorries (6.5% ≤8 yrs; 7.5% for 8<yrs≤10) | 1–10 |
| 7.5% | Murabahah Trade Financing | 1–15 |
| 8.5% | Murabahah Office / Apartment / Business Property | 1–15 |

Staff simply **select the product and the number of years** and the profit is
computed from the table. Years are whole years.

## Loan Calculator

Select a product and term; enter the financing amount. It computes:

- **Profit rate** = `ProfitRate(product, years)` from the table; **total profit** =
  `principal × rate`; **total payable** = principal + profit.
- **Monthly installment** = `total payable ÷ (years × 12)` (equal flat‑Murabaha
  installments — principal repaid straight‑line, profit spread evenly).
- **Minimum shares requirement** — to qualify, a member must hold a minimum in
  their shares account, a configurable fraction of the financing (default **one
  third**). Shows the required amount and, if short, exactly **how much more they
  must add** (e.g. financing MUR 900,000 → requires MUR 300,000; holding
  MUR 200,000 → must add MUR 100,000).
- **Full schedule of payments** — month-by-month table (opening, principal,
  profit, payment, closing), on screen and in the PDF (`<File ID> - Loan Schedule.pdf`).

## Rebate tool

Select the product, original term and **years already paid**. Early settlement
uses the profit table directly: the society keeps the profit for the years
served, and the rebate is the profit for the **unserved** years.

- **Total profit** = `principal × ProfitRate(N)` for the full term N.
- **Profit earned** (kept) = `principal × ProfitRate(k)` for the k years served.
- **Unearned profit** (rebate‑eligible) = `principal × (ProfitRate(N) − ProfitRate(k))`
  — equivalently, the sum of the marginal per‑year rates for years k+1…N.
- **Rebate amount (Ibra')** — 100% of the unearned profit by default (full Ibra'),
  with an adjustable 0–100% field for partial‑rebate products.
- **Outstanding principal** — straight‑line, `principal × (N − k) / N`.
- **Amount to pay to settle** = outstanding principal + profit still payable.
- A **per‑year rate breakdown** shows each year's marginal rate, flagged Paid or
  Rebated.

### Worked example (default form state)

Product HGF (benchmark 5.5%), principal MUR 1,000,000, term 11 years, paid 8 years:
total profit **MUR 401,369.36** (40.14%), profit earned **MUR 340,463.61** (8‑yr
rate 34.05%), rebate = profit for years 9–11 = **MUR 60,905.75**, outstanding
principal **MUR 272,727.27** (3/11), amount to settle **MUR 272,727.27**.

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
    profitTable.ts      # products, benchmarks, and the profit-rate formula
    profitTable.test.ts # validates the formula against the society's table
    rebate.ts           # early-settlement rebate logic
    rebate.test.ts      # rebate unit tests (worked example + edge cases)
    loan.ts             # loan installments, schedule, shares requirement
    loan.test.ts        # loan unit tests
    format.ts           # shared MUR / percent formatting
    pdf.ts              # jsPDF rebate settlement-statement generator
    loanPdf.ts          # jsPDF loan schedule-of-payments generator
  components/
    PasscodeGate.tsx
    Toolbar.tsx         # per-tool title + Reset/Download actions
    ui.tsx              # shared inputs, cards, result rows
  tools/
    LoanCalculator.tsx  # "Loan Calculator" tab
    RebateTool.tsx      # "Rebate tool" tab
  App.tsx               # shell: passcode gate, brand bar, tab navigation
  main.tsx
```

The profit model lives in `src/lib/profitTable.ts`, with the rebate and loan
logic in `rebate.ts` and `loan.ts` — all pure and fully unit-tested, so the
domain maths can be verified independently of the UI.

## Notes / not-yet-specified behaviour

- **Insurance paid?** (rebate tool) — captured as a checkbox and shown on the
  PDF. The business rules for the "insurance not paid" case were not provided and
  are not yet applied to the calculation; wire them into `rebate.ts` when supplied.
- **Shares requirement** is a percentage of the financing (default one third),
  with the required amount rounded to the nearest rupee. Adjust the percentage
  per product.
- **Motor Vehicle Financing** benchmarks step up for the 8 < years ≤ 10 band
  (per the profit table); the app selects the right benchmark automatically from
  the number of years.
- No member data is persisted anywhere — member name and file ID are used only
  for the on-screen record and the generated PDF.
