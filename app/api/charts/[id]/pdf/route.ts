import { NextResponse } from 'next/server';
import { ensureAppUser, SYSTEM_USER_ID } from '@/lib/appUser';
import { prisma } from '@/lib/prisma';
import { ChartRow } from '@/lib/types';
import { generateSimplifiedGiftChartPdf } from '@/lib/pdf';
import { exportBaseName } from '@/lib/fileName';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = {
  params: { id: string };
};

export async function GET(_: Request, { params }: Context) {
  try {
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

    const filename = `${exportBaseName(chart.projectName, chart.goalAmount)}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PDF export failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
