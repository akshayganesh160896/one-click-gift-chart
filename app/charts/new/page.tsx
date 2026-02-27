import GiftChartEditor from '@/components/gift-chart-editor';
import { ensureAppUser } from '@/lib/appUser';

export const dynamic = 'force-dynamic';

export default async function NewChartPage() {
  await ensureAppUser();

  return <GiftChartEditor />;
}
