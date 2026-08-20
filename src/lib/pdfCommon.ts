/** Shared helpers for the generated PDFs (branding, colors, filenames). */
import { jsPDF } from 'jspdf';
import { LOGO_DATA_URL } from './logoBase64';

export const TEAL: [number, number, number] = [15, 118, 110];
export const DARK: [number, number, number] = [30, 41, 59];
export const LIGHT: [number, number, number] = [241, 245, 249];
export const MARGIN_X = 40;

/**
 * Draw the branded header band (logo + society name + subtitle + date) and
 * return the Y coordinate to continue below it.
 */
export function drawHeader(doc: jsPDF, subtitle: string): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...TEAL);
  doc.rect(0, 0, pageWidth, 92, 'F');

  // Logo in a white rounded square.
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(MARGIN_X, 20, 52, 52, 6, 6, 'F');
  try {
    doc.addImage(LOGO_DATA_URL, 'PNG', MARGIN_X + 4, 24, 44, 44);
  } catch {
    // If the image fails for any reason, the header still renders without it.
  }

  const textX = MARGIN_X + 68;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Albarakah MCSL', textX, 44);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(pdfSafe(subtitle), textX, 62);

  doc.setFontSize(9);
  doc.text(
    `Generated: ${new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}`,
    pageWidth - MARGIN_X,
    62,
    { align: 'right' },
  );

  return 112;
}

/** Draw an empty checkbox square at (x, y) with a side length. */
export function drawCheckbox(doc: jsPDF, x: number, y: number, size = 10): void {
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.8);
  doc.roundedRect(x, y, size, size, 1.5, 1.5, 'S');
}

/**
 * Replace characters the standard PDF (WinAnsi) fonts cannot render, so they
 * don't garble the output. Notably ≤ / ≥ are outside WinAnsi.
 */
export function pdfSafe(text: string): string {
  return text
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/[–—]/g, '-')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"');
}

/** Strip characters illegal in filenames, keeping spaces and hyphens. */
export function safeFilenamePart(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 60);
}
