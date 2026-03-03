import { NextResponse } from 'next/server';
import { ensureAppUser, SYSTEM_USER_ID } from '@/lib/appUser';
import { prisma } from '@/lib/prisma';
import { ChartRow } from '@/lib/types';
import { generateSimplifiedGiftChartPdf } from '@/lib/pdf';

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

  const buffer = await generateSimplifiedGiftChartPdf({
    projectName: chart.projectName,
    rows: chart.chartJson as unknown as ChartRow[]
  });

  const safeProject = chart.projectName.replace(/[^a-z0-9-_]/gi, '_');
  const filename = `OneClickGiftChart_${safeProject}_${chart.goalAmount}_Simplified.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
}
