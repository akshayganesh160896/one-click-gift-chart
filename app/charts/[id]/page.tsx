import { notFound } from 'next/navigation';
import GiftChartEditor from '@/components/gift-chart-editor';
import { ensureAppUser, SYSTEM_USER_ID } from '@/lib/appUser';
import { prisma } from '@/lib/prisma';
import { ChartRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Props = {
  params: { id: string };
};

export default async function ChartEditorPage({ params }: Props) {
  await ensureAppUser();

  const chart = await prisma.giftChart.findFirst({
    where: {
      id: params.id,
      userId: SYSTEM_USER_ID
    }
  });

  if (!chart) {
    notFound();
  }

  return (
    <GiftChartEditor
      initial={{
        id: chart.id,
        projectName: chart.projectName,
        goalAmount: chart.goalAmount,
        tiersCount: chart.tiersCount as 3 | 4,
        leadGiftAmount: chart.leadGiftAmount,
        rows: chart.chartJson as unknown as ChartRow[]
      }}
    />
  );
}
