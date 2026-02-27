'use client';

import { Fragment, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChartRow } from '@/lib/types';
import {
  buildRangeText,
  formatUsd,
  generateGiftChart,
  rebalanceGiftChart,
  rowsTotal,
  tierSubtotal,
  updateLeadGiftAndRebalance
} from '@/lib/giftChart';

const editorSchema = z.object({
  projectName: z.string().min(1, 'Project name is required'),
  goalAmount: z.coerce.number().int().positive('Goal amount must be a positive integer'),
  tiersCount: z.union([z.literal(3), z.literal(4)]),
  leadGiftAmount: z.coerce.number().int().positive('Lead gift must be positive')
});

type EditorForm = z.infer<typeof editorSchema>;

type Props = {
  initial?: {
    id: string;
    projectName: string;
    goalAmount: number;
    tiersCount: 3 | 4;
    leadGiftAmount: number;
    rows: ChartRow[];
  };
};

const defaultLeadGift = (goalAmount: number) => Math.max(1, Math.round(goalAmount * 0.2));

export default function GiftChartEditor({ initial }: Props) {
  const initialGoalAmount = initial?.goalAmount ?? 1000000;
  const initialLeadGiftAmount = initial?.leadGiftAmount ?? defaultLeadGift(initialGoalAmount);

  const router = useRouter();
  const [chartId, setChartId] = useState(initial?.id ?? null);
  const [rows, setRows] = useState<ChartRow[]>(
    initial?.rows ?? generateGiftChart(initialGoalAmount, 3, initialLeadGiftAmount)
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLeadAuto, setIsLeadAuto] = useState(!initial);

  const form = useForm<EditorForm>({
    resolver: zodResolver(editorSchema),
    defaultValues: {
      projectName: initial?.projectName ?? 'New Campaign',
      goalAmount: initialGoalAmount,
      tiersCount: initial?.tiersCount ?? 3,
      leadGiftAmount: initialLeadGiftAmount
    }
  });

  const goalAmount = form.watch('goalAmount');
  const tiersCount = form.watch('tiersCount') as 3 | 4;
  const leadGiftAmount = form.watch('leadGiftAmount');
  const safeGoalAmount = Number.isFinite(goalAmount) ? goalAmount : 0;
  const safeLeadGiftAmount = Number.isFinite(leadGiftAmount) ? leadGiftAmount : 1;

  const total = useMemo(() => rowsTotal(rows), [rows]);
  const totalGiftCount = useMemo(() => rows.reduce((sum, row) => sum + row.giftCount, 0), [rows]);
  const delta = safeGoalAmount - total;

  const regenerate = () => {
    const leadToUse = isLeadAuto ? defaultLeadGift(safeGoalAmount) : safeLeadGiftAmount;
    if (isLeadAuto) {
      form.setValue('leadGiftAmount', leadToUse, { shouldValidate: true });
    }
    const generated = generateGiftChart(safeGoalAmount, tiersCount, leadToUse);
    setRows(generated);
    setNotice(null);
  };

  const rebalance = () => {
    const result = rebalanceGiftChart(rows, safeGoalAmount);
    setRows(result.rows);
    setNotice(result.warning ?? null);
  };

  const handleCountEdit = (index: number, nextValue: number) => {
    const normalized = Number.isFinite(nextValue) ? Math.max(1, Math.round(nextValue)) : 1;
    const nextRows = rows.map((row, i) => (i === index ? { ...row, giftCount: normalized } : row));
    const result = rebalanceGiftChart(nextRows, safeGoalAmount, Array.from({ length: index + 1 }, (_, i) => i));
    setRows(result.rows);
    setNotice(result.warning ?? null);
  };

  const applyLeadGift = () => {
    const result = updateLeadGiftAndRebalance(rows, safeLeadGiftAmount, safeGoalAmount);
    setRows(result.rows);
    setNotice(result.warning ?? null);
  };

  const saveChart = async () => {
    const parsed = editorSchema.safeParse(form.getValues());
    if (!parsed.success) {
      form.trigger();
      return null;
    }

    const payload = {
      ...parsed.data,
      tiersCount: (parsed.data.tiersCount === 4 ? 4 : 3) as 3 | 4,
      rows
    };

    if (rowsTotal(rows) !== parsed.data.goalAmount) {
      const result = rebalanceGiftChart(rows, parsed.data.goalAmount);
      setRows(result.rows);
      setNotice('Chart was automatically rebalanced before save.');
      payload.rows = result.rows;
    }

    const endpoint = chartId ? `/api/charts/${chartId}` : '/api/charts';
    const method = chartId ? 'PUT' : 'POST';
    const response = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error ?? 'Failed to save chart');
    }

    const data = await response.json();
    if (!chartId) {
      setChartId(data.id);
      router.replace(`/charts/${data.id}`);
    }
    router.refresh();
    return data.id as string;
  };

  const onSave = async () => {
    setIsSaving(true);
    try {
      await saveChart();
      setNotice('Saved successfully.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to save chart.');
    } finally {
      setIsSaving(false);
    }
  };

  const onSaveAndExport = async () => {
    setIsSaving(true);
    try {
      const id = await saveChart();
      if (!id) return;
      const response = await fetch(`/api/charts/${id}/export`);
      if (!response.ok) throw new Error('Failed to export workbook');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const safeProject = form.getValues('projectName').replace(/[^a-z0-9-_]/gi, '_');
      anchor.download = `OneClickGiftChart_${safeProject}_${form.getValues('goalAmount')}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
      setNotice('Saved and downloaded workbook.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to save and export.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gift Chart Editor</h1>
          <p className="text-sm text-slate-600">Live edits keep totals aligned with campaign goal.</p>
        </div>
        <div className="flex gap-3">
          <button
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
            onClick={onSave}
            disabled={isSaving}
          >
            Save
          </button>
          <button
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
            onClick={onSaveAndExport}
            disabled={isSaving}
          >
            Save & Download Excel
          </button>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4 rounded-2xl bg-white p-5 shadow-soft">
          <div className="grid gap-4 md:grid-cols-4">
            <label className="text-sm font-medium md:col-span-2">
              <span title="Project name attached to this chart">Project Name</span>
              <input className="mt-1 w-full rounded-lg border px-3 py-2" {...form.register('projectName')} />
            </label>
            <label className="text-sm font-medium">
              <span title="Final total must equal this value">Campaign Goal</span>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border px-3 py-2"
                {...form.register('goalAmount', {
                  valueAsNumber: true,
                  onChange: (event) => {
                    const nextGoal = Math.max(1, Number(event.target.value) || 0);
                    if (!isLeadAuto) {
                      return;
                    }
                    const nextLead = defaultLeadGift(nextGoal);
                    form.setValue('leadGiftAmount', nextLead, { shouldValidate: true });
                    setRows(generateGiftChart(nextGoal, tiersCount, nextLead));
                    setNotice(null);
                  }
                })}
              />
            </label>
            <label className="text-sm font-medium">
              <span title="Choose 3 tiers (default) or 4 tiers">Tiers</span>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2"
                {...form.register('tiersCount', { valueAsNumber: true })}
                onChange={(event) => {
                  form.setValue('tiersCount', Number(event.target.value) === 4 ? 4 : 3);
                  setTimeout(regenerate, 0);
                }}
              >
                <option value={3}>3 tiers</option>
                <option value={4}>4 tiers</option>
              </select>
            </label>
            <div className="flex items-end">
              <button onClick={regenerate} className="w-full rounded-lg border border-brand px-3 py-2 text-sm font-semibold text-brand">
                Regenerate
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left" title="Tier grouping of 3 levels each">Tier</th>
                  <th className="px-3 py-2 text-left" title="Rank inside each tier">Level</th>
                  <th className="px-3 py-2 text-left">Number of Gifts Needed</th>
                  <th className="px-3 py-2 text-left">Gift Range</th>
                  <th className="px-3 py-2 text-left">Gift Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const showTier = row.level === 1;
                  const showSubtotal = row.level === 3;
                  const subtotal = showSubtotal ? tierSubtotal(rows, row.tier) : null;
                  return (
                    <Fragment key={row.id}>
                      <tr className="border-b">
                        <td className="px-3 py-2 font-semibold">{showTier ? row.tierLabel : ''}</td>
                        <td className="px-3 py-2">{row.level}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={1}
                            value={row.giftCount}
                            onChange={(event) => handleCountEdit(index, Number(event.target.value))}
                            className="w-28 rounded border px-2 py-1"
                          />
                        </td>
                        <td className="px-3 py-2">{buildRangeText(row)}</td>
                        <td className="px-3 py-2">{formatUsd(row.giftCount * row.lowerBound)}</td>
                      </tr>
                      {showSubtotal ? (
                        <tr className="border-b bg-slate-50/70 text-slate-700">
                          <td className="px-3 py-2 text-xs font-semibold" colSpan={4}>
                            gifts yielding a total of
                          </td>
                          <td className="px-3 py-2 text-sm font-semibold">{formatUsd(subtotal ?? 0)}</td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
                <tr className="bg-slate-900 text-white">
                  <td className="px-3 py-2 font-semibold" colSpan={4}>
                    TOTAL GIFTS
                  </td>
                  <td className="px-3 py-2 font-semibold">{formatUsd(total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-4 rounded-2xl bg-white p-5 shadow-soft">
          <h2 className="text-lg font-semibold">Adjustments</h2>
          <div className="rounded-xl border border-brand/40 bg-brand/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Total Gifts Needed</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{totalGiftCount.toLocaleString('en-US')}</p>
            <p className="text-xs text-slate-600">Sum of all “Number of Gifts Needed” rows</p>
          </div>
          <label className="block text-sm font-medium">
            <span title="Lead gift sets the top row and all other ranges derive from halving.">Lead Gift Amount</span>
            <input
              type="number"
              className="mt-1 w-full rounded-lg border px-3 py-2"
              {...form.register('leadGiftAmount', {
                valueAsNumber: true,
                onChange: () => {
                  setIsLeadAuto(false);
                }
              })}
            />
          </label>
          <button className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold" onClick={applyLeadGift}>
            Apply Lead Gift
          </button>
          <button className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white" onClick={rebalance}>
            Rebalance
          </button>
          <p className={`text-sm ${delta === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
            {delta === 0 ? 'Balanced exactly.' : `Out of balance by ${formatUsd(Math.abs(delta))}`}
          </p>
          {notice ? <p className="text-xs text-slate-500">{notice}</p> : null}
        </aside>
      </section>
    </main>
  );
}
