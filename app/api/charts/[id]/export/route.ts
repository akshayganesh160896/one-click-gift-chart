import { NextResponse } from 'next/server';
import { ensureAppUser, SYSTEM_USER_ID } from '@/lib/appUser';
import { prisma } from '@/lib/prisma';
import { generateGiftChartWorkbook } from '@/lib/excel';
import { ChartRow } from '@/lib/types';
import { exportBaseName } from '@/lib/fileName';

type Context = {
  params: { id: string };
};

export async function GET(_: Request, { params }: Context) {
  await ensureAppUser();

  const chart = await prisma.giftChart.findFirst({
    where: {
      id: params.id,
      userId: SYSTEM_USER_ID
    }
  });

  if (!chart) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const buffer = await generateGiftChartWorkbook({
    projectName: chart.projectName,
    goalAmount: chart.goalAmount,
    rows: chart.chartJson as unknown as ChartRow[]
  });

  const filename = `${exportBaseName(chart.projectName, chart.goalAmount)}.xlsx`;

  const bytes = new Uint8Array(buffer);

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
}
