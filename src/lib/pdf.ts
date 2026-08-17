/**
 * Client-side PDF generation for the settlement statement.
 *
 * Uses jsPDF + jspdf-autotable rather than window.print(), which is unreliable
 * or blocked in embedded/sandboxed contexts.
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  formatMUR,
  formatPercent,
  type CalculatorInputs,
  type CalculationResult,
} from './calc';

export interface MemberDetails {
  name: string;
  fileId: string;
}

export interface PdfPayload {
  member: MemberDetails;
  inputs: CalculatorInputs;
  result: CalculationResult;
  insurancePaid: boolean;
}

const TEAL: [number, number, number] = [15, 118, 110];
const DARK: [number, number, number] = [30, 41, 59];
const LIGHT: [number, number, number] = [241, 245, 249];

/** Strip characters that are illegal in filenames, keeping spaces and hyphens. */
function safeFilenamePart(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 60);
}

/**
 * Build the download filename. Primary form is "<File ID> - Rebate"
 * (e.g. "AB1002 - Rebate.pdf"); falls back to the member name, then a generic
 * label, when no File ID is provided.
 */
export function buildSettlementFilename(fileId: string, name = ''): string {
  const id = safeFilenamePart(fileId);
  const who = safeFilenamePart(name);
  const label = id || who;
  return label ? `${label} - Rebate.pdf` : 'Rebate Statement.pdf';
}

export function generateSettlementPdf(payload: PdfPayload): void {
  const { member, inputs, result, insurancePaid } = payload;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;
  let y = 44;

  // ---- Header / branding ------------------------------------------------
  doc.setFillColor(...TEAL);
  doc.rect(0, 0, pageWidth, 90, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Albarakah MCSL', marginX, 44);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text('Early Settlement Statement (Ibra’ Rebate)', marginX, 64);

  const generated = new Date();
  doc.setFontSize(9);
  doc.text(
    `Generated: ${generated.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}`,
    pageWidth - marginX,
    64,
    { align: 'right' },
  );

  y = 118;

  // ---- Member details ---------------------------------------------------
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Member Details', marginX, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3, textColor: DARK },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 140 },
      1: { cellWidth: 'auto' },
    },
    body: [
      ['Member name', member.name || '—'],
      ['Membership / File ID', member.fileId || '—'],
    ],
    margin: { left: marginX, right: marginX },
  });
  // @ts-expect-error lastAutoTable is added by the plugin at runtime.
  y = doc.lastAutoTable.finalY + 18;

  // ---- Financing details ------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Financing Details', marginX, y);
  y += 6;

  const financingRows: string[][] = [
    ['Principal amount', formatMUR(inputs.principal)],
    ['Original tenure', `${inputs.tenureYears} years`],
    [
      'Profit basis',
      inputs.profitMode === 'flat'
        ? 'Flat total profit (entered directly)'
        : 'Rate tiers',
    ],
    [
      'Total profit over tenure',
      `${formatMUR(result.totalProfit)}  (${formatPercent(result.totalProfitPercentOfPrincipal)} of principal)`,
    ],
  ];

  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3, textColor: DARK },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 180 },
      1: { cellWidth: 'auto' },
    },
    body: financingRows,
    margin: { left: marginX, right: marginX },
  });
  // @ts-expect-error runtime property
  y = doc.lastAutoTable.finalY + 16;

  // ---- Tier breakdown (tier mode only) ----------------------------------
  if (inputs.profitMode === 'tiers') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Rate Tier Breakdown', marginX, y);
    y += 8;

    const tierRows = result.resolvedTiers.map((t, i) => [
      `Tier ${i + 1}${t.isLast ? ' (remaining years)' : ''}`,
      `Years ${t.startYear % 1 === 0 ? t.startYear + 1 : (t.startYear + 1).toFixed(1)}–${
        t.endYear % 1 === 0 ? t.endYear : t.endYear.toFixed(1)
      }`,
      `${formatPercent(t.ratePercent)}/yr`,
      `${t.effectiveDuration} yr`,
      formatMUR(t.profit),
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Tier', 'Period', 'Rate', 'Duration', 'Profit']],
      body: tierRows,
      theme: 'striped',
      headStyles: { fillColor: TEAL, textColor: 255, fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 4, textColor: DARK },
      alternateRowStyles: { fillColor: LIGHT },
      margin: { left: marginX, right: marginX },
    });
    // @ts-expect-error runtime property
    y = doc.lastAutoTable.finalY + 16;
  }

  // ---- Settlement position ---------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Settlement Position', marginX, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3, textColor: DARK },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 220 },
      1: { cellWidth: 'auto' },
    },
    body: [
      ['Years already paid', `${inputs.yearsElapsed} years`],
      ['Years remaining', `${result.yearsRemaining} years`],
      ['Rebate given (of remaining profit)', formatPercent(inputs.rebatePercent)],
      ['Insurance paid', insurancePaid ? 'Yes' : 'No'],
    ],
    margin: { left: marginX, right: marginX },
  });
  // @ts-expect-error runtime property
  y = doc.lastAutoTable.finalY + 16;

  // ---- Rebate breakdown -------------------------------------------------
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Rebate Breakdown', marginX, y);
  y += 6;

  const breakdownRows: string[][] = [
    [
      result.isApproximation
        ? 'Remaining (unearned) profit  (straight-line estimate)'
        : 'Remaining (unearned) profit',
      formatMUR(result.remainingProfit),
    ],
    [
      `Rebate amount (Ibra’) — ${formatPercent(result.rebatePercentOfPrincipal)} of principal`,
      formatMUR(result.rebateAmount),
    ],
    ['Profit still payable after rebate', formatMUR(result.profitStillPayable)],
    ['Outstanding principal (remaining years)', formatMUR(result.outstandingPrincipal)],
  ];

  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 4, textColor: DARK },
    columnStyles: {
      0: { cellWidth: 340 },
      1: { halign: 'right', cellWidth: 'auto', fontStyle: 'bold' },
    },
    body: breakdownRows,
    margin: { left: marginX, right: marginX },
  });
  // @ts-expect-error runtime property
  y = doc.lastAutoTable.finalY + 12;

  if (result.isApproximation) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9);
    doc.text(
      'Note: remaining profit was estimated straight-line from a flat total profit figure and is an approximation.',
      marginX,
      y,
    );
    y += 16;
  }

  // ---- Highlighted final amount ----------------------------------------
  const boxHeight = 56;
  doc.setFillColor(...TEAL);
  doc.roundedRect(marginX, y, pageWidth - marginX * 2, boxHeight, 6, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('AMOUNT TO PAY TO SETTLE ACCOUNT', marginX + 16, y + 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(formatMUR(result.amountToSettle), pageWidth - marginX - 16, y + 38, {
    align: 'right',
  });
  y += boxHeight + 20;

  // ---- Footer -----------------------------------------------------------
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    `Albarakah MCSL profit on this financing after rebate: ${formatMUR(result.albarakahProfit)}`,
    marginX,
    y,
  );
  y += 12;
  doc.text(
    'This statement is generated for internal use and is subject to verification by Albarakah MCSL.',
    marginX,
    y,
  );

  doc.save(buildSettlementFilename(member.fileId, member.name));
}
