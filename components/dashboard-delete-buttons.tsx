'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

async function runDelete(url: string, password: string): Promise<Response> {
  return fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ password })
  });
}

export function DeleteChartButton({ chartId, projectName }: { chartId: string; projectName: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function onDelete() {
    const confirmed = window.confirm(`Delete "${projectName}"? This cannot be undone.`);
    if (!confirmed) return;

    const password = window.prompt('Enter password to delete this chart:');
    if (!password) return;

    setIsDeleting(true);
    try {
      const response = await runDelete(`/api/charts/${chartId}`, password);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        window.alert(payload?.error ?? 'Delete failed.');
        return;
      }
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={isDeleting}
      className="text-xs font-medium text-rose-600 underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isDeleting ? 'Deleting...' : 'Delete'}
    </button>
  );
}

export function ClearAllChartsButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function onClearAll() {
    const confirmed = window.confirm('Delete all saved charts? This cannot be undone.');
    if (!confirmed) return;

    const password = window.prompt('Enter password to clear all charts:');
    if (!password) return;

    setIsDeleting(true);
    try {
      const response = await runDelete('/api/charts', password);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        window.alert(payload?.error ?? 'Clear all failed.');
        return;
      }
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClearAll}
      disabled={disabled || isDeleting}
      className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isDeleting ? 'Clearing...' : 'Clear all'}
    </button>
  );
}
