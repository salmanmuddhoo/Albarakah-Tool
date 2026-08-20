/** Shared number-formatting helpers (MUR amounts and percentages). */

/** Format a MUR amount for display. */
export function formatMUR(amount: number, withSymbol = true): string {
  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
  const formatted = rounded.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return withSymbol ? `MUR ${formatted}` : formatted;
}

/** Format a percentage for display. */
export function formatPercent(value: number, digits = 2): string {
  const rounded = Math.round((value + Number.EPSILON) * 10 ** digits) / 10 ** digits;
  return `${rounded.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })}%`;
}
