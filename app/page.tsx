import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-6">
      <section className="w-full rounded-2xl bg-white p-10 shadow-soft">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-brand">visualize your campaign with</p>
        <h1 className="mb-3 text-4xl font-bold text-slate-900">One Click Gift Chart</h1>
        <p className="mb-8 max-w-2xl text-slate-600">
          Create, rebalance, save, and export campaign gift charts that always match your goal exactly.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:opacity-95"
        >
          Open Dashboard
        </Link>
      </section>
    </main>
  );
}
