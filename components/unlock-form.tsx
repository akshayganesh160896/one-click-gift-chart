'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

type UnlockFormProps = {
  nextPath: string;
};

export default function UnlockForm({ nextPath }: UnlockFormProps) {
  const router = useRouter();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode })
      });
      if (!response.ok) {
        setError('Wrong passcode.');
        return;
      }
      const safeNext = nextPath.startsWith('/') ? nextPath : '/dashboard';
      router.push(safeNext);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <section className="w-full rounded-2xl bg-white p-8 shadow-soft">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-brand">One Click Gift Chart</p>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">Enter Passcode</h1>
        <p className="mb-6 text-sm text-slate-600">Passcode is required to view or create gift charts.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="password"
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Enter passcode"
            required
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
          >
            {submitting ? 'Checking...' : 'Unlock'}
          </button>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </form>
      </section>
    </main>
  );
}
