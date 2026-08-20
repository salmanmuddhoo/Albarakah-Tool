/**
 * Client-side PDF generation for the loan / financing schedule of payments.
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatMUR, formatPercent } from './format';
import { type LoanResult } from './loan';

const TEAL: [number, number, number] = [15, 118, 110];
const DARK: [number, number, number] = [30, 41, 59];
const LIGHT: [number, number, number] = [241, 245, 249];

export interface LoanPdfPayload {
  member: { name: string; fileId: string; product: string };
  principal: number;
  years: number;
  currentShares: number;
  shareRatioPercent: number;
  result: LoanResult;
}

function safeFilenamePart(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 60);
}

export function buildLoanFilename(fileId: string, name = ''): string {
  const label = safeFilenamePart(fileId) || safeFilenamePart(name);
  return label ? `${label} - Loan Schedule.pdf` : 'Loan Schedule.pdf';
}

export function generateLoanPdf(payload: LoanPdfPayload): void {
  const { member, result } = payload;
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
  doc.text('Financing Schedule of Payments', marginX, 64);
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
  // @ts-expect-error runtime property added by the plugin
  y = doc.lastAutoTable.finalY + 16;

  // ---- Financing summary ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Financing Summary', marginX, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3, textColor: DARK },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 220 }, 1: { cellWidth: 'auto' } },
    body: [
      ['Principal (financing amount)', formatMUR(payload.principal)],
      ['Term', `${payload.years} years (${result.totalMonths} months)`],
      ['Benchmark rate', `${formatPercent(result.benchmark)}/yr`],
      [
        'Profit rate',
        `${formatPercent(result.profitRatePercent)} of principal`,
      ],
      ['Total profit', formatMUR(result.totalProfit)],
      ['Total amount payable', formatMUR(result.totalPayable)],
      ['Monthly installment', `${formatMUR(result.monthlyPayment)} / month`],
    ],
    margin: { left: marginX, right: marginX },
  });
  // @ts-expect-error runtime property
  y = doc.lastAutoTable.finalY + 16;

  // ---- Shares requirement ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Minimum Shares Requirement', marginX, y);
  y += 6;
  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3, textColor: DARK },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 240 }, 1: { cellWidth: 'auto' } },
    body: [
      [
        `Required shares (${formatPercent(payload.shareRatioPercent)} of financing)`,
        formatMUR(result.requiredShares),
      ],
      ['Member current shares', formatMUR(payload.currentShares)],
      [
        result.sharesMet ? 'Status' : 'Additional shares to add',
        result.sharesMet
          ? 'Requirement met'
          : formatMUR(result.sharesShortfall),
      ],
    ],
    margin: { left: marginX, right: marginX },
  });
  // @ts-expect-error runtime property
  y = doc.lastAutoTable.finalY + 18;

  // ---- Amortization schedule (auto-paginates) ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Schedule of Payments', marginX, y);
  y += 8;

  const scheduleRows = result.schedule.map((r) => [
    String(r.month),
    formatMUR(r.openingBalance, false),
    formatMUR(r.principalPortion, false),
    formatMUR(r.profitPortion, false),
    formatMUR(r.payment, false),
    formatMUR(r.closingBalance, false),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Opening', 'Principal', 'Profit', 'Payment', 'Closing']],
    body: scheduleRows,
    theme: 'striped',
    headStyles: { fillColor: TEAL, textColor: 255, fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 3, textColor: DARK, halign: 'right' },
    columnStyles: { 0: { halign: 'center', cellWidth: 28 } },
    alternateRowStyles: { fillColor: LIGHT },
    margin: { left: marginX, right: marginX },
  });

  // ---- Footer note ----
  // @ts-expect-error runtime property
  let footerY = doc.lastAutoTable.finalY + 16;
  const pageHeight = doc.internal.pageSize.getHeight();
  if (footerY > pageHeight - 40) {
    doc.addPage();
    footerY = 50;
  }
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    'All amounts in MUR. This schedule is generated for internal use and is subject to verification by Albarakah MCSL.',
    marginX,
    footerY,
  );

  doc.save(buildLoanFilename(member.fileId, member.name));
}
