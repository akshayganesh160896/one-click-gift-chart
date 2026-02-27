import Link from 'next/link';
import { ensureAppUser, SYSTEM_USER_ID } from '@/lib/appUser';
import { prisma } from '@/lib/prisma';
import { formatCurrency } from '@/lib/currency';

export default async function DashboardPage() {
  await ensureAppUser();

  const charts = await prisma.giftChart.findMany({
    where: { userId: SYSTEM_USER_ID },
    orderBy: { updatedAt: 'desc' }
  });

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">One Click Gift Chart</h1>
          <p className="text-slate-600">Build and manage capital campaign gift charts.</p>
        </div>
        <Link href="/" className="text-sm font-medium text-slate-600 underline underline-offset-4">
          Home
        </Link>
      </header>

      <Link
        href="/charts/new"
        className="block rounded-2xl border border-brand/30 bg-brand/10 p-6 transition hover:bg-brand/15"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">Create new gift chart</p>
        <p className="mt-1 text-lg font-semibold">Start from a campaign goal and generate a full table instantly.</p>
      </Link>

      <section className="rounded-2xl bg-white p-6 shadow-soft">
        <h2 className="mb-4 text-lg font-semibold">Your charts</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Project</th>
                <th className="px-3 py-2">Goal</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {charts.map((chart) => (
                <tr key={chart.id} className="border-b last:border-0">
                  <td className="px-3 py-3">
                    <Link href={`/charts/${chart.id}`} className="font-semibold text-brand hover:underline">
                      {chart.projectName}
                    </Link>
                  </td>
                  <td className="px-3 py-3">{formatCurrency(chart.goalAmount)}</td>
                  <td className="px-3 py-3">{new Date(chart.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-3">{new Date(chart.updatedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {charts.length === 0 ? <p className="mt-4 text-sm text-slate-500">No charts yet.</p> : null}
      </section>
    </main>
  );
}
