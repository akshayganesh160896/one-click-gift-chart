import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
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

const BRAND = rgb(0.25, 0.76, 0.67); // #40c1ac
const BRAND_DARK = rgb(0.17, 0.62, 0.55);
const BRAND_MID = rgb(0.20, 0.70, 0.62);
const BG_ALT = rgb(0.93, 0.98, 0.97);
const BORDER = rgb(0.17, 0.44, 0.40);
const TEXT = rgb(0.06, 0.09, 0.16);
const SHADOW = rgb(0.10, 0.32, 0.29);

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
  const map = new Map<number, TierGroup>();
  for (const row of rows) {
    const group = map.get(row.tier) ?? { tierLabel: row.tierLabel, rows: [] };
    group.rows.push(row);
    map.set(row.tier, group);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, value]) => value);
};

const drawCenteredText = (
  page: import('pdf-lib').PDFPage,
  text: string,
  font: import('pdf-lib').PDFFont,
  size: number,
  x: number,
  y: number,
  width: number,
  color = TEXT
) => {
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: x + Math.max(0, (width - textWidth) / 2),
    y,
    size,
    font,
    color
  });
};

const drawSimplifiedTable = (
  page: import('pdf-lib').PDFPage,
  groups: TierGroup[],
  title: string,
  getRange: (row: ChartRow) => string,
  x: number,
  topY: number,
  width: number,
  regular: import('pdf-lib').PDFFont,
  bold: import('pdf-lib').PDFFont
) => {
  const tierWidth = 72;
  const rangeWidth = width - tierWidth;
  const headerHeight = 34;
  const rowHeight = 24;

  // Card shadow for subtle 3D lift.
  page.drawRectangle({
    x: x + 4,
    y: topY - headerHeight - groups.reduce((s, g) => s + g.rows.length * rowHeight, 0) - 4,
    width,
    height: headerHeight + groups.reduce((s, g) => s + g.rows.length * rowHeight, 0),
    color: SHADOW,
    opacity: 0.14
  });

  // Main table card.
  page.drawRectangle({
    x,
    y: topY - headerHeight - groups.reduce((s, g) => s + g.rows.length * rowHeight, 0),
    width,
    height: headerHeight + groups.reduce((s, g) => s + g.rows.length * rowHeight, 0),
    color: rgb(1, 1, 1),
    borderColor: BORDER,
    borderWidth: 1.2
  });

  // Header with gloss stripe.
  page.drawRectangle({ x, y: topY - headerHeight, width, height: headerHeight, color: BRAND_DARK, borderColor: BORDER, borderWidth: 1.2 });
  page.drawRectangle({
    x,
    y: topY - 12,
    width,
    height: 10,
    color: rgb(1, 1, 1),
    opacity: 0.18
  });
  drawCenteredText(page, title, bold, 11, x, topY - 21, width, rgb(1, 1, 1));

  let cursorY = topY - headerHeight;
  let stripe = 0;

  for (const group of groups) {
    const groupHeight = group.rows.length * rowHeight;

    page.drawRectangle({ x, y: cursorY - groupHeight, width: tierWidth, height: groupHeight, color: BRAND_MID, borderColor: BORDER, borderWidth: 1 });
    page.drawRectangle({
      x,
      y: cursorY - 8,
      width: tierWidth,
      height: 8,
      color: rgb(1, 1, 1),
      opacity: 0.16
    });
    drawCenteredText(page, `Tier ${group.tierLabel}`, bold, 11, x, cursorY - groupHeight / 2 - 4, tierWidth, rgb(1, 1, 1));

    for (let i = 0; i < group.rows.length; i += 1) {
      const rowY = cursorY - (i + 1) * rowHeight;
      page.drawRectangle({
        x: x + tierWidth,
        y: rowY,
        width: rangeWidth,
        height: rowHeight,
        color: stripe % 2 === 0 ? rgb(1, 1, 1) : BG_ALT,
        borderColor: BORDER,
        borderWidth: 1
      });
      drawCenteredText(page, getRange(group.rows[i]), regular, 10.5, x + tierWidth, rowY + 8, rangeWidth, TEXT);
      stripe += 1;
    }

    // Thick outline to separate each tier block.
    page.drawRectangle({
      x,
      y: cursorY - groupHeight,
      width,
      height: groupHeight,
      borderColor: BORDER,
      borderWidth: 2.2,
      color: rgb(0, 0, 0),
      opacity: 0
    });
    page.drawLine({ start: { x, y: cursorY - groupHeight }, end: { x: x + width, y: cursorY - groupHeight }, thickness: 1.8, color: BORDER });
    cursorY -= groupHeight;
  }
};

export async function generateSimplifiedGiftChartPdf(input: ExportInput): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([792, 612]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const titleFont = await pdf.embedFont(StandardFonts.TimesRomanBold);

  // Layered background for a polished rendered feel.
  page.drawRectangle({ x: 0, y: 0, width: 792, height: 612, color: rgb(0.96, 1, 0.99) });
  page.drawRectangle({ x: 0, y: 500, width: 792, height: 112, color: rgb(0.90, 0.98, 0.96), opacity: 0.65 });

  page.drawText(input.projectName, { x: 40, y: 560, size: 30, font: titleFont, color: BRAND_DARK });
  page.drawText('Simplified Gift Chart', { x: 40, y: 535, size: 13, font: regular, color: TEXT });

  const groups = groupByTier(input.rows);
  const topY = 500;
  const tableWidth = 330;

  drawSimplifiedTable(page, groups, 'Campaign Gift Ranges', rangeText, 40, topY, tableWidth, regular, bold);
  drawSimplifiedTable(page, groups, 'Sample Annual Payments (over 5 years)', annualRangeText, 422, topY, tableWidth, regular, bold);

  // Simple clear arrow between tables.
  page.drawSvgPath('M 382 362 L 454 318 L 382 274 Z', {
    color: BRAND_DARK,
    borderColor: BRAND_DARK,
    borderWidth: 1.2
  });

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
