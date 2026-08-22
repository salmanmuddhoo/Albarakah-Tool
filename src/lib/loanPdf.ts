/**
 * Client-side PDF generation for the loan / financing schedule of payments.
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatMUR, formatPercent } from './format';
import { type LoanResult } from './loan';
import { TEAL, DARK, LIGHT, MARGIN_X, drawHeader, drawCheckbox, safeFilenamePart, pdfSafe } from './pdfCommon';
import { buildChecklist, applicantTypeLabel, type ApplicantType } from './checklist';

const marginX = MARGIN_X;

export interface LoanPdfPayload {
  member: { name: string; fileId: string; product: string; productId: string };
  applicantType: ApplicantType;
  principal: number;
  years: number;
  currentShares: number;
  shareRatioPercent: number;
  result: LoanResult;
}

export function buildLoanFilename(fileId: string, name = ''): string {
  const label = safeFilenamePart(fileId) || safeFilenamePart(name);
  return label ? `${label} - Loan Schedule.pdf` : 'Loan Schedule.pdf';
}

export function generateLoanPdf(payload: LoanPdfPayload): void {
  const { member, result } = payload;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = drawHeader(doc, 'Financing Schedule of Payments');

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
      ['Financing product', pdfSafe(member.product || '-')],
      ['Applicant type', applicantTypeLabel(payload.applicantType)],
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
      ['Profit rate', `${formatPercent(result.profitRatePercent)} of principal`],
      ['Total profit', formatMUR(result.totalProfit)],
      ['Total amount payable', formatMUR(result.totalPayable)],
      ['Monthly installment', `${formatMUR(result.monthlyPayment)} / month`],
      ['Total PRF (insurance) over term', formatMUR(result.totalPrf)],
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
        result.sharesMet ? 'Requirement met' : formatMUR(result.sharesShortfall),
      ],
    ],
    margin: { left: marginX, right: marginX },
  });
  // @ts-expect-error runtime property
  y = doc.lastAutoTable.finalY + 18;

  // ---- Documents checklist (per product + applicant type) ----
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Documents Checklist (for approval)', marginX, y);
  y += 16;

  const sections = buildChecklist(member.productId, payload.applicantType);
  const textWidth = pageWidth - marginX * 2 - 18;
  for (const section of sections) {
    // Keep a section heading with at least its first item on the page.
    if (y > pageHeight - 80) {
      doc.addPage();
      y = 50;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...TEAL);
    doc.text(pdfSafe(section.title), marginX, y);
    y += 15;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    for (const item of section.items) {
      const lines = doc.splitTextToSize(pdfSafe(item), textWidth) as string[];
      const blockHeight = Math.max(14, lines.length * 11 + 4);
      if (y + blockHeight > pageHeight - 40) {
        doc.addPage();
        y = 50;
      }
      drawCheckbox(doc, marginX, y - 8, 10);
      doc.text(lines, marginX + 16, y);
      y += blockHeight;
    }
    y += 6;
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  if (y > pageHeight - 40) {
    doc.addPage();
    y = 50;
  }
  doc.text(
    'Condensed from the society official SCF document checklist; to be verified against the current form.',
    marginX,
    y,
    { maxWidth: pageWidth - marginX * 2 },
  );
  y += 16;

  // ---- Amortization schedule (auto-paginates) ----
  if (y > pageHeight - 120) {
    doc.addPage();
    y = 50;
  }
  doc.setTextColor(...DARK);
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
    r.prf > 0 ? formatMUR(r.prf, false) : '',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Opening', 'Principal', 'Profit', 'Payment', 'Closing', 'PRF']],
    body: scheduleRows,
    theme: 'striped',
    headStyles: { fillColor: TEAL, textColor: 255, fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 3, textColor: DARK, halign: 'right' },
    columnStyles: { 0: { halign: 'center', cellWidth: 24 } },
    alternateRowStyles: { fillColor: LIGHT },
    margin: { left: marginX, right: marginX },
  });

  // ---- Footer note ----
  // @ts-expect-error runtime property
  let footerY = doc.lastAutoTable.finalY + 16;
  if (footerY > pageHeight - 40) {
    doc.addPage();
    footerY = 50;
  }
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    'PRF is a yearly insurance premium (1% of the amount remaining to repay, capped at MUR 4,000). It does not reduce the loan balance and is shown for information.',
    marginX,
    footerY,
    { maxWidth: pageWidth - marginX * 2 },
  );
  footerY += 20;
  doc.text(
    'All amounts in MUR. This schedule is generated for internal use and is subject to verification by Albarakah MCSL.',
    marginX,
    footerY,
    { maxWidth: pageWidth - marginX * 2 },
  );

  doc.save(buildLoanFilename(member.fileId, member.name));
}
