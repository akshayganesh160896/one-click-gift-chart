import PDFDocument from 'pdfkit';
import { ChartRow } from '@/lib/types';
import { formatCurrency } from '@/lib/currency';

type ExportInput = {
  projectName: string;
  rows: ChartRow[];
};

type TierGroup = {
  tierLabel: string;
  rows: ChartRow[];
};

const BRAND = '#40c1ac';
const BRAND_DARK = '#2a9d8b';
const LIGHT_BG = '#e9faf7';
const BORDER = '#2f6f66';

const rangeText = (row: ChartRow): string => {
  if (row.upperBound === null) return `${formatCurrency(row.lowerBound)} or more`;
  return `${formatCurrency(row.lowerBound)} to ${formatCurrency(row.upperBound)}`;
};

const annualRangeText = (row: ChartRow): string => {
  const annualLower = Math.max(1, Math.floor(row.lowerBound / 5));
  if (row.upperBound === null) return `${formatCurrency(annualLower)} or more`;
  const annualUpper = Math.max(annualLower, Math.floor(row.upperBound / 5));
  return `${formatCurrency(annualLower)} to ${formatCurrency(annualUpper)}`;
};

const groupByTier = (rows: ChartRow[]): TierGroup[] => {
  const byTier = new Map<number, TierGroup>();
  for (const row of rows) {
    const group = byTier.get(row.tier) ?? { tierLabel: row.tierLabel, rows: [] };
    group.rows.push(row);
    byTier.set(row.tier, group);
  }
  return Array.from(byTier.entries())
    .sort((a, b) => a[0] - b[0])
    .map((entry) => entry[1]);
};

const drawSimplifiedTable = (
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  title: string,
  groups: TierGroup[],
  getRange: (row: ChartRow) => string
): number => {
  const tierWidth = 84;
  const rangeWidth = width - tierWidth;
  const headerHeight = 44;
  const rowHeight = 28;

  doc.save();

  doc.roundedRect(x, y, width, headerHeight, 8).fillAndStroke(BRAND_DARK, BORDER);
  doc.fillColor('white').font('Helvetica-Bold').fontSize(12).text(title, x, y + 12, {
    width,
    align: 'center'
  });

  let cursorY = y + headerHeight;
  let rowIndex = 0;

  for (const group of groups) {
    const groupHeight = group.rows.length * rowHeight;

    doc.rect(x, cursorY, tierWidth, groupHeight).fillAndStroke(BRAND, BORDER);
    doc.fillColor('white').font('Helvetica-Bold').fontSize(12).text(`Tier ${group.tierLabel}`, x, cursorY + groupHeight / 2 - 8, {
      width: tierWidth,
      align: 'center'
    });

    for (let i = 0; i < group.rows.length; i += 1) {
      const row = group.rows[i];
      const rowY = cursorY + i * rowHeight;
      const fill = rowIndex % 2 === 0 ? '#ffffff' : LIGHT_BG;
      doc.rect(x + tierWidth, rowY, rangeWidth, rowHeight).fillAndStroke(fill, BORDER);
      doc.fillColor('#0f172a').font('Helvetica').fontSize(11).text(getRange(row), x + tierWidth + 8, rowY + 8, {
        width: rangeWidth - 16,
        align: 'center'
      });
      rowIndex += 1;
    }

    doc.lineWidth(1.7).moveTo(x, cursorY + groupHeight).lineTo(x + width, cursorY + groupHeight).strokeColor(BORDER).stroke();
    cursorY += groupHeight;
    doc.lineWidth(1);
  }

  doc.restore();
  return cursorY - y;
};

export async function generateSimplifiedGiftChartPdf(input: ExportInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 40 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#f8fffd');
    doc.fillColor(BRAND_DARK).font('Helvetica-Bold').fontSize(24).text(input.projectName, 40, 36);
    doc.fillColor('#0f172a').font('Helvetica').fontSize(13).text('Simplified Gift Chart', 40, 66);

    const groups = groupByTier(input.rows);
    const topY = 104;
    const tableWidth = 252;
    const leftX = 40;
    const rightX = 320;

    drawSimplifiedTable(doc, leftX, topY, tableWidth, 'Campaign Gift Ranges', groups, rangeText);

    doc.fillColor(BRAND_DARK).font('Helvetica-Bold').fontSize(28).text('→', 292, 248, { width: 20, align: 'center' });

    drawSimplifiedTable(doc, rightX, topY, tableWidth, 'Sample Annual Payments (over 5 years)', groups, annualRangeText);

    doc.end();
  });
}
