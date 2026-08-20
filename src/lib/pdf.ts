/**
 * Client-side PDF generation for the early-settlement (Ibra') statement.
 *
 * Uses jsPDF + jspdf-autotable rather than window.print(), which is unreliable
 * or blocked in embedded/sandboxed contexts.
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatMUR, formatPercent } from './format';
import { type RebateInputs, type RebateResult } from './rebate';

export interface MemberDetails {
  name: string;
  fileId: string;
  product: string;
}

export interface PdfPayload {
  member: MemberDetails;
  inputs: RebateInputs;
  result: RebateResult;
  insurancePaid: boolean;
}

const TEAL: [number, number, number] = [15, 118, 110];
const DARK: [number, number, number] = [30, 41, 59];
const LIGHT: [number, number, number] = [241, 245, 249];

function safeFilenamePart(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 60);
}

export function buildSettlementFilename(fileId: string, name = ''): string {
  const label = safeFilenamePart(fileId) || safeFilenamePart(name);
  return label ? `${label} - Rebate.pdf` : 'Rebate Statement.pdf';
}

export function generateSettlementPdf(payload: PdfPayload): void {
  const { member, inputs, result, insurancePaid } = payload;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;
  let y = 44;

  // ---- Header / branding ----
  doc.setFillColor(...TEAL);
  doc.rect(0, 0, pageWidth, 90, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Albarakah MCSL', marginX, 44);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text('Early Settlement Statement (Ibra’ Rebate)', marginX, 64);
  doc.setFontSize(9);
  doc.text(
    `Generated: ${new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}`,
    pageWidth - marginX,
    64,
    { align: 'right' },
  );

  y = 118;

  // ---- Member details ----
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Member & Product', marginX, y);
  y += 6;
  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3, textColor: DARK },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 160 }, 1: { cellWidth: 'auto' } },
    body: [
      ['Member name', member.name || '—'],
      ['Membership / File ID', member.fileId || '—'],
      ['Financing product', member.product || '—'],
    ],
    margin: { left: marginX, right: marginX },
  });
  // @ts-expect-error runtime property
  y = doc.lastAutoTable.finalY + 16;

  // ---- Financing details ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Financing Details', marginX, y);
  y += 6;
  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3, textColor: DARK },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 200 }, 1: { cellWidth: 'auto' } },
    body: [
      ['Principal amount', formatMUR(inputs.principal)],
      ['Original term', `${inputs.years} years`],
      ['Benchmark rate', `${formatPercent(result.benchmark)}/yr`],
      [
        'Total profit (full term)',
        `${formatMUR(result.totalProfit)}  (${formatPercent(result.totalProfitPercent)} of principal)`,
      ],
    ],
    margin: { left: marginX, right: marginX },
  });
  // @ts-expect-error runtime property
  y = doc.lastAutoTable.finalY + 16;

  // ---- Settlement position ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Settlement Position', marginX, y);
  y += 6;
  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3, textColor: DARK },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 220 }, 1: { cellWidth: 'auto' } },
    body: [
      ['Years already paid', `${inputs.yearsPaid} years`],
      ['Years remaining', `${result.yearsRemaining} years`],
      ['Rebate given (of unearned profit)', formatPercent(inputs.rebatePercent)],
      ['Insurance paid', insurancePaid ? 'Yes' : 'No'],
    ],
    margin: { left: marginX, right: marginX },
  });
  // @ts-expect-error runtime property
  y = doc.lastAutoTable.finalY + 16;

  // ---- Per-year rate breakdown ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Per-Year Profit Rate Breakdown', marginX, y);
  y += 8;
  const yearRows = result.yearRows.map((r) => [
    `Year ${r.year}`,
    `${formatPercent(r.marginalRatePercent)}`,
    formatMUR(r.marginalAmount, false),
    r.served ? 'Paid (kept by society)' : 'Rebated (unserved)',
  ]);
  autoTable(doc, {
    startY: y,
    head: [['Year', 'Rate', 'Profit (MUR)', 'Status']],
    body: yearRows,
    theme: 'striped',
    headStyles: { fillColor: TEAL, textColor: 255, fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 4, textColor: DARK },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    alternateRowStyles: { fillColor: LIGHT },
    margin: { left: marginX, right: marginX },
  });
  // @ts-expect-error runtime property
  y = doc.lastAutoTable.finalY + 16;

  // ---- Rebate breakdown ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Rebate Breakdown', marginX, y);
  y += 6;
  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 4, textColor: DARK },
    columnStyles: {
      0: { cellWidth: 340 },
      1: { halign: 'right', cellWidth: 'auto', fontStyle: 'bold' },
    },
    body: [
      [`Profit earned for years served (${inputs.yearsPaid} yr)`, formatMUR(result.earnedProfit)],
      ['Unearned profit (unserved years)', formatMUR(result.unearnedProfit)],
      [
        `Rebate amount (Ibra’) — ${formatPercent(result.rebatePercentOfPrincipal)} of principal`,
        formatMUR(result.rebateAmount),
      ],
      ['Profit still payable after rebate', formatMUR(result.profitStillPayable)],
      ['Outstanding principal (remaining years)', formatMUR(result.outstandingPrincipal)],
    ],
    margin: { left: marginX, right: marginX },
  });
  // @ts-expect-error runtime property
  y = doc.lastAutoTable.finalY + 14;

  // ---- Highlighted final amount (with page-break guard) ----
  const pageHeight = doc.internal.pageSize.getHeight();
  const boxHeight = 56;
  if (y + boxHeight + 50 > pageHeight) {
    doc.addPage();
    y = 50;
  }
  doc.setFillColor(...TEAL);
  doc.roundedRect(marginX, y, pageWidth - marginX * 2, boxHeight, 6, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('AMOUNT TO PAY TO SETTLE ACCOUNT', marginX + 16, y + 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(formatMUR(result.amountToSettle), pageWidth - marginX - 16, y + 38, { align: 'right' });
  y += boxHeight + 20;

  // ---- Footer ----
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
