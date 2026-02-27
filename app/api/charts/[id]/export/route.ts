import { NextResponse } from 'next/server';
import { ensureAppUser, SYSTEM_USER_ID } from '@/lib/appUser';
import { prisma } from '@/lib/prisma';
import { generateGiftChartWorkbook } from '@/lib/excel';
import { ChartRow } from '@/lib/types';

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

  const safeProject = chart.projectName.replace(/[^a-z0-9-_]/gi, '_');
  const filename = `OneClickGiftChart_${safeProject}_${chart.goalAmount}.xlsx`;

  const bytes = new Uint8Array(buffer);

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
}
