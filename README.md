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

The published table uses **whole-number rates**: years 1–3 (relative ratio = 1)
keep the exact flat rate, and from year 4 the geometrically-decreased rate is
**rounded to the nearest whole number** — this is the rate the society actually
charges. Examples: group‑1 benchmark 5.5 → 8 years = **34%**, 11 years = **40%**;
MVF 8<Yrs≤10 benchmark 6.5 → 10 years = **45%**. This reproduces every value in
the society's July‑2024 profit table exactly (verified in `profitTable.test.ts`).

### Products and benchmarks

| Benchmark | Products | Years |
| --- | --- | --- |
| 5.5% | Murabahah HGF / REF / CF / MCF · Istisnaa HF · Service Ijarah ATF / UF / WF / EF | 1–15 |
| 6.0% | Murabahah MVF — Personal Use, **vehicle age ≤ 8 yrs** | 1–15 |
| 6.5% | Murabahah MVF — Personal Use, **vehicle age 8–10 yrs** | 1–15 |
| 6.5% | Murabahah MVF — Trade (Taxis / Vans / Lorries), **vehicle age ≤ 8 yrs** | 1–15 |
| 7.5% | Murabahah MVF — Trade (Taxis / Vans / Lorries), **vehicle age 8–10 yrs** | 1–15 |
| 7.5% | Murabahah Trade Financing | 1–15 |
| 8.5% | Murabahah Office / Apartment / Business Property | 1–15 |

Staff simply **select the product and the number of years** and the profit is
computed from the table. Years are whole years. For Motor Vehicle Financing the
`≤ 8` / `8–10` bands are the **age of the vehicle** (not the financing term), so
each band is a separate product to pick from.

## Loan Calculator

Select a product and term; enter the financing amount. It computes:

- **Profit rate** = `ProfitRate(product, years)` from the table; **total profit** =
  `principal × rate`; **total payable** = principal + profit.
- **Monthly installment** = `total payable ÷ (years × 12)` — **equal (level)**
  installments across the whole term.
- **Minimum shares requirement** — to qualify, a member must hold a minimum in
  their shares account: **one third (33.33%)** or **25%** of the financing,
  chosen from a dropdown. Shows the required amount and, if short, exactly **how
  much more they must add**.
- **PRF (yearly insurance premium)** — shown as a column in the schedule. It is
  1% of the amount remaining to repay at the start of the year, **capped at
  MUR 4,000/year**. In the schedule it appears at **month 1** for year 1, then at
  **month (K − 1)×12** for each following year K (month 12, 24, 36, …). It is
  informational and does **not** change the loan balance. The total PRF over the
  term is shown too.
- **Full schedule of payments** — month-by-month table whose **opening/closing
  balance is the total amount payable** (capital + profit) reducing to zero, with
  columns for capital, profit, payment and PRF. On screen and in the PDF
  (`<File ID> - Loan Schedule.pdf`).
- **Application fees** — itemised from the society's table of charges: a
  processing / administrative fee by financing-amount band, a Rs 30,000 govt.
  registration fee for financing above Rs 1,000,000, and product-specific fees
  (completion / notary / visit and an evaluation fee), with an indicative total.
  Shown on screen and on the PDF. See `src/lib/fees.ts`.
- **Applicant type** — Salaried person, Self-Employed, Pensioner or Other. This
  drives the income documents in the checklist.
- **Documents checklist** — shown on screen and printed on the PDF with tick
  boxes, built per **financing product** and **applicant type**, in four sections:
  common documents, income documents (by applicant type), product-specific
  documents (HGF, HF, MVF/MCF, REF, …) and sureties/guarantors. Condensed from
  the society's official SCF document checklist forms; see `src/lib/checklist.ts`.

## Rebate tool

Select the product, original term and **years already paid**. Early settlement
uses the profit table directly: the society keeps the profit for the years
served, and the rebate is the profit for the **unserved** years.

- **Total profit** = `principal × ProfitRate(N)` for the full term N.
- **Profit earned** (kept) = `principal × ProfitRate(k)` for the k years served.
- **Unearned profit** (rebated in full, Ibra') = `principal × (ProfitRate(N) − ProfitRate(k))`.
- **Total already paid** = `monthly installment × months served` (equal
  installments). Because the installment is level, the member has paid capital
  and profit at the average (straight‑line) rate.
- **Outstanding capital** — remaining unpaid capital, `principal × (N − k) / N`.
- **Profit still payable after rebate** — the profit that was *earned* for the
  served years but not yet paid through the level installments
  (`earned profit − profit paid`). With front‑loaded profit recognition this is
  positive at early settlement.
- **PRF reconciliation** — the officer enters the **PRF actually paid** (shown in
  a prominent callout with the indicative PRF due). Any shortfall is **added to
  the amount to settle**.
- **Amount to pay to settle** = outstanding capital + profit still payable +
  outstanding PRF = `remaining balance − rebate + outstanding PRF`.
- A **per‑year rate breakdown** shows each year's marginal rate, flagged Paid or
  Rebated.

### Worked example (default form state)

Product HGF (benchmark 5.5%), principal MUR 1,000,000, term 10 years, paid 3 years
(total profit **MUR 380,000** at 38%, payable MUR 1,380,000, level installment
**MUR 11,500**): total already paid **MUR 414,000** (capital 300,000 + profit
114,000), earned profit **MUR 165,000** (3‑yr rate 16.5%), rebate **MUR 215,000**,
outstanding capital **MUR 700,000**, profit still payable **MUR 51,000**, PRF due
**MUR 12,000** — amount to settle **MUR 763,000** (or MUR 751,000 if the PRF is up
to date).

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
    prf.ts              # PRF yearly insurance premium (1% capped at 4,000)
    prf.test.ts         # PRF unit tests (worked example + edge cases)
    rebate.ts           # early-settlement rebate logic (incl. PRF reconciliation)
    rebate.test.ts      # rebate unit tests (worked example + edge cases)
    loan.ts             # loan installments, schedule (incl. PRF), shares
    loan.test.ts        # loan unit tests
    format.ts           # shared MUR / percent formatting
    logoBase64.ts       # logo as a data URL for PDF embedding
    pdfCommon.ts        # shared PDF header (logo), colors, checkbox, helpers
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

- **Insurance** is handled by the **PRF** (the yearly premium), so there is no
  separate "insurance paid" checkbox — the rebate tool reconciles the actual PRF
  paid against the indicative amount due.
- **Shares requirement** is either one third (33.33%) or 25% of the financing
  (dropdown), with the required amount rounded to the nearest rupee.
- **Motor Vehicle Financing** benchmarks depend on the **vehicle's age** band
  (≤ 8 yrs vs 8–10 yrs), not the financing term. Each age band is listed as a
  separate product so staff pick the one matching the vehicle.
- No member data is persisted anywhere — member name and file ID are used only
  for the on-screen record and the generated PDF.
