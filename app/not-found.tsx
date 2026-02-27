import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold">Chart not found</h1>
      <p className="text-slate-600">This chart does not exist or you do not have access.</p>
      <Link href="/dashboard" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">
        Return to dashboard
      </Link>
    </main>
  );
}
