import ExcelJS from 'exceljs';
import { ChartRow } from '@/lib/types';
import { buildRangeText, tierSubtotal } from '@/lib/giftChart';
import { formatCurrency } from '@/lib/currency';

type ExportInput = {
  projectName: string;
  goalAmount: number;
  rows: ChartRow[];
};

export async function generateGiftChartWorkbook(input: ExportInput): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Gift Chart');
  const brand = 'FF40C1AC';
  const brandDark = 'FF2A9D8B';
  const ink = 'FF0F172A';
  const grid = 'FF7BAEA5';
  const tierBand = 'FFE8F8F5';
  const subtotalBand = 'FFF2FBF9';

  sheet.columns = [
    { key: 'tier', width: 12 },
    { key: 'count', width: 14 },
    { key: 'range', width: 28 },
    { key: 'amount', width: 16 },
    { key: 'eq', width: 6 },
    { key: 'value', width: 26 }
  ];

  sheet.mergeCells('A1:F1');
  sheet.getCell('A1').value = `${input.projectName} - Goal ${formatCurrency(input.goalAmount)}`;
  sheet.getCell('A1').font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' }, size: 14 };
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brandDark } };
  sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.getRow(1).height = 26;

  sheet.addRow([]);
  const header = sheet.addRow(['Tier', '# of gifts', 'Gift range', '$ amount', '=', 'Value of gifts at this level']);
  header.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brand } };
  header.alignment = { vertical: 'middle', horizontal: 'center' };

  let currentRow = 4;
  const tiers = Array.from(new Set(input.rows.map((r) => r.tier)));

  for (const tier of tiers) {
    const tierRows = input.rows.filter((row) => row.tier === tier);
    const tierStart = currentRow;

    for (const row of tierRows) {
      const excelRow = sheet.addRow([
        row.level === 1 ? row.tierLabel : '',
        row.giftCount,
        buildRangeText(row),
        row.lowerBound,
        '=',
        row.giftCount * row.lowerBound
      ]);
      excelRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: tierBand } };
      excelRow.getCell(4).numFmt = '$#,##0';
      excelRow.getCell(6).numFmt = '$#,##0';
      currentRow += 1;
    }

    sheet.mergeCells(`A${tierStart}:A${tierStart + tierRows.length - 1}`);
    const tierCell = sheet.getCell(`A${tierStart}`);
    tierCell.alignment = { horizontal: 'center', vertical: 'middle' };
    tierCell.font = { name: 'Calibri', bold: true, color: { argb: ink } };
    tierCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brand } };

    const subtotal = tierSubtotal(input.rows, tier);
    const subtotalRow = sheet.addRow(['gifts yielding a total of', '', '', '', '', subtotal]);
    sheet.mergeCells(`A${subtotalRow.number}:E${subtotalRow.number}`);
    subtotalRow.getCell(6).numFmt = '$#,##0';
    subtotalRow.font = { name: 'Calibri', bold: true };
    subtotalRow.getCell(1).alignment = { horizontal: 'right' };
    subtotalRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: subtotalBand } };
    subtotalRow.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: subtotalBand } };

    for (let col = 1; col <= 6; col += 1) {
      const topCell = sheet.getCell(tierStart, col);
      const bottomCell = sheet.getCell(subtotalRow.number, col);
      topCell.border = {
        ...topCell.border,
        top: { style: 'medium', color: { argb: brandDark } }
      };
      bottomCell.border = {
        ...bottomCell.border,
        bottom: { style: 'medium', color: { argb: brandDark } }
      };
    }
    currentRow += 1;
  }

  const totalRow = sheet.addRow(['TOTAL GIFTS', '', '', '', '', input.goalAmount]);
  sheet.mergeCells(`A${currentRow}:E${currentRow}`);
  totalRow.getCell(1).font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' } };
  totalRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brandDark } };
  totalRow.getCell(1).alignment = { horizontal: 'right' };
  totalRow.getCell(6).font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' } };
  totalRow.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brandDark } };
  totalRow.getCell(6).numFmt = '$#,##0';

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber < 3) return;
    row.eachCell((cell) => {
      if (!cell.font) {
        cell.font = { name: 'Calibri', size: 11 };
      } else if (!cell.font.name) {
        cell.font = { ...cell.font, name: 'Calibri' };
      }
      cell.border = {
        top: { style: 'thin', color: { argb: grid } },
        left: { style: 'thin', color: { argb: grid } },
        bottom: { style: 'thin', color: { argb: grid } },
        right: { style: 'thin', color: { argb: grid } }
      };
      if (!cell.alignment) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
