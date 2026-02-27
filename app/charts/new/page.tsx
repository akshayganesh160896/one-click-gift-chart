import GiftChartEditor from '@/components/gift-chart-editor';
import { ensureAppUser } from '@/lib/appUser';

export default async function NewChartPage() {
  await ensureAppUser();

  return <GiftChartEditor />;
}
