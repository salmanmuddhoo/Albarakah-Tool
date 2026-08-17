# Albarakah MCSL — Early Settlement Rebate (Ibra') Calculator

A small, standalone web app for Albarakah MCSL staff / IT Committee to calculate
the early-settlement profit rebate (Ibra') owed to a member who pays off an
Islamic financing product ahead of schedule, and to produce a shareable PDF
settlement statement.

There is **no database, no member records, and no user accounts** — it is a
single-purpose internal calculator. The only gate is a shared staff passcode.

## What it does

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
    calc.ts        # core domain logic (pure, framework-free) — the rebate maths
    calc.test.ts   # unit tests validating the worked example and edge cases
    pdf.ts         # jsPDF settlement-statement generator
  components/
    PasscodeGate.tsx
  App.tsx          # the calculator UI (inputs + live results panel)
  main.tsx
```

All calculation logic lives in `src/lib/calc.ts` and is fully unit-tested, so the
domain maths can be verified independently of the UI.

## Notes / not-yet-specified behaviour

- **Insurance paid?** — captured as a checkbox and shown on the PDF. The business
  rules for the "insurance not paid" case were not provided and are not yet
  applied to the calculation; wire them into `calc.ts` when supplied.
- No member data is persisted anywhere — member name and file ID are used only
  for the on-screen record and the generated PDF.
