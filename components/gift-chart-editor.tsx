'use client';

import { Fragment, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChartRow } from '@/lib/types';
import { exportBaseName } from '@/lib/fileName';
import {
  applySecondLastRangeOverride,
  applyHighRangeOverride,
  buildRangeText,
  formatUsd,
  generateGiftChart,
  getSecondLastRangeOptions,
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
const ONE_MILLION = 1000000;
const highRangeOptions = (current: number, previousBound: number | null, goalAmount: number) => {
  const options = new Set<number>();
  options.add(current);

  if (goalAmount >= 200000000 && previousBound && previousBound >= 50000000) {
    const cleanOptions = [
      Math.round(previousBound * 0.75 / 10000000) * 10000000,
      Math.round(previousBound * 0.625 / 5000000) * 5000000,
      Math.round(previousBound * 0.5 / 10000000) * 10000000
    ];
    cleanOptions.forEach((value) => {
      if (value >= ONE_MILLION && value < previousBound) options.add(value);
    });
  } else {
    options.add(Math.max(ONE_MILLION, current - ONE_MILLION));
    options.add(current + ONE_MILLION);
    options.add(Math.max(ONE_MILLION, Math.round((current * 2) / 3 / ONE_MILLION) * ONE_MILLION));
    options.add(Math.max(ONE_MILLION, Math.round((current * 3) / 4 / ONE_MILLION) * ONE_MILLION));
  }

  return Array.from(options).sort((a, b) => b - a);
};

export default function GiftChartEditor({ initial }: Props) {
  const hasInitial = Boolean(initial);
  const initialGoalAmount = initial?.goalAmount;
  const initialLeadGiftAmount =
    initial && typeof initial.goalAmount === 'number'
      ? initial.leadGiftAmount ?? defaultLeadGift(initial.goalAmount)
      : undefined;

  const router = useRouter();
  const [chartId, setChartId] = useState(initial?.id ?? null);
  const [rows, setRows] = useState<ChartRow[]>(
    initial?.rows ?? []
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLeadAuto, setIsLeadAuto] = useState(true);
  const [removedTier3Rows, setRemovedTier3Rows] = useState<ChartRow[]>([]);

  const form = useForm<EditorForm>({
    resolver: zodResolver(editorSchema),
    defaultValues: {
      projectName: initial?.projectName ?? '',
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
  const tier3Rows = useMemo(() => rows.filter((row) => row.tier === 3), [rows]);
  const editableHighRangeRows = useMemo(
    () => rows
      .map((row, index) => ({ row, index }))
      .filter(({ row, index }) => row.lowerBound >= ONE_MILLION && index !== 0),
    [rows]
  );
  const secondLastRowMeta = useMemo(() => {
    if (rows.length < 2) return null;
    const secondLastIndex = rows.length - 2;
    const previousBound = rows[secondLastIndex - 1]?.lowerBound ?? Number.MAX_SAFE_INTEGER;
    const options = getSecondLastRangeOptions(previousBound, 1000);
    if (!options.includes(rows[secondLastIndex].lowerBound)) {
      options.unshift(rows[secondLastIndex].lowerBound);
    }
    return {
      row: rows[secondLastIndex],
      rowIndex: secondLastIndex,
      options: Array.from(new Set(options)).sort((a, b) => b - a)
    };
  }, [rows]);
  const delta = safeGoalAmount - total;

  const regenerate = () => {
    if (safeGoalAmount <= 0) {
      setRows([]);
      setNotice('Enter a campaign goal to generate the chart.');
      return;
    }
    const leadToUse = isLeadAuto ? defaultLeadGift(safeGoalAmount) : safeLeadGiftAmount;
    if (isLeadAuto) {
      form.setValue('leadGiftAmount', leadToUse, { shouldValidate: true });
    }
    const generated = generateGiftChart(safeGoalAmount, tiersCount, leadToUse);
    setRows(generated);
    setRemovedTier3Rows([]);
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
    if (safeGoalAmount <= 0) {
      setNotice('Enter a campaign goal to apply lead gift.');
      return;
    }
    if (rows.length === 0) {
      const generated = generateGiftChart(safeGoalAmount, tiersCount, safeLeadGiftAmount);
      setRows(generated);
      setRemovedTier3Rows([]);
      setNotice('Applied lead gift to a newly generated chart.');
      return;
    }
    const result = updateLeadGiftAndRebalance(rows, safeLeadGiftAmount, safeGoalAmount);
    setRows(result.rows);
    setRemovedTier3Rows([]);
    setNotice(result.warning ?? null);
  };

  const resetChart = () => {
    setIsLeadAuto(true);
    if (safeGoalAmount <= 0) {
      form.setValue('leadGiftAmount', undefined as unknown as number);
      setRows([]);
      setRemovedTier3Rows([]);
      setNotice('Reset complete. Enter campaign goal to generate defaults.');
      return;
    }
    const resetLead = defaultLeadGift(safeGoalAmount);
    form.setValue('leadGiftAmount', resetLead, { shouldValidate: true });
    setRows(generateGiftChart(safeGoalAmount, tiersCount, resetLead));
    setRemovedTier3Rows([]);
    setNotice('Chart reset to default ranges and counts.');
  };

  const handleHighRangeEdit = (rowIndex: number, value: number) => {
    const result = applyHighRangeOverride(rows, rowIndex, value, safeGoalAmount);
    setRows(result.rows);
    setNotice(result.warning ?? null);
  };

  const handleSecondLastRangeEdit = (value: number) => {
    const result = applySecondLastRangeOverride(rows, value, safeGoalAmount);
    setRows(result.rows);
    setNotice(result.warning ?? null);
  };

  const normalizeRanges = (input: ChartRow[]) => {
    const next = input.map((row) => ({ ...row }));
    for (let i = 1; i < next.length; i += 1) {
      next[i].upperBound = next[i - 1].lowerBound - 1;
    }
    if (next.length > 0) {
      next[0].upperBound = null;
    }
    return next;
  };

  const renumberTierLevels = (input: ChartRow[], tier: number) => {
    let level = 1;
    return input.map((row) => {
      if (row.tier !== tier) return row;
      const next = { ...row, level };
      level += 1;
      return next;
    });
  };

  const removeTier3Level = () => {
    const current = rows.filter((row) => row.tier === 3);
    if (current.length <= 1) return;
    const target = current[current.length - 1];
    const targetId = target.id;
    const next = rows.filter((row) => row.id !== targetId);
    const normalized = normalizeRanges(renumberTierLevels(next, 3));
    const result = rebalanceGiftChart(normalized, safeGoalAmount);
    setRows(result.rows);
    setRemovedTier3Rows((prev) => [...prev, target]);
    setNotice('Removed one level from Tier III and rebalanced.');
  };

  const addTier3Level = () => {
    const current = rows.filter((row) => row.tier === 3);
    if (current.length >= 3) return;
    if (safeGoalAmount <= 0) return;

    const restored = removedTier3Rows[removedTier3Rows.length - 1];
    let baseRow: ChartRow | undefined = restored;
    if (!baseRow) {
      const template = generateGiftChart(
        safeGoalAmount,
        tiersCount,
        isLeadAuto ? defaultLeadGift(safeGoalAmount) : safeLeadGiftAmount
      ).filter((row) => row.tier === 3);
      baseRow = template[current.length];
    }
    if (!baseRow) return;

    const insertAt = rows.findIndex((row) => row.tier > 3);
    const newRow: ChartRow = {
      ...baseRow,
      id: `r-3-${Date.now()}-${current.length + 1}`,
      level: current.length + 1,
      giftCount: Math.max(
        current[current.length - 1]?.giftCount ?? 1,
        baseRow.giftCount
      )
    };

    const next = [...rows];
    if (insertAt === -1) {
      next.push(newRow);
    } else {
      next.splice(insertAt, 0, newRow);
    }

    const normalized = normalizeRanges(renumberTierLevels(next, 3));
    const result = rebalanceGiftChart(normalized, safeGoalAmount);
    setRows(result.rows);
    if (restored) {
      setRemovedTier3Rows((prev) => prev.slice(0, -1));
    }
    setNotice('Added one level to Tier III and rebalanced.');
  };

  const saveChart = async () => {
    const parsed = editorSchema.safeParse(form.getValues());
    if (!parsed.success) {
      form.trigger();
      return null;
    }
    if (rows.length === 0) {
      setNotice('Generate a chart before saving.');
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
      anchor.download = `${exportBaseName(form.getValues('projectName'), Number(form.getValues('goalAmount')))}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
      setNotice('Saved and downloaded workbook.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to save and export.');
    } finally {
      setIsSaving(false);
    }
  };

  const onSaveAndPdf = async () => {
    setIsSaving(true);
    try {
      const id = await saveChart();
      if (!id) return;
      window.location.assign(`/api/charts/${id}/pdf?ts=${Date.now()}`);
      setNotice('Saved and downloaded simplified PDF.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to save and export PDF.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/dashboard" className="mb-2 inline-block text-sm font-semibold text-brand hover:underline">
            ← Back to Dashboard
          </Link>
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
          <button
            className="rounded-lg border border-brand bg-white px-4 py-2 text-sm font-semibold text-brand"
            onClick={onSaveAndPdf}
            disabled={isSaving}
          >
            Save & Download PDF
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
                    const rawValue = String(event.target.value ?? '').trim();
                    if (!rawValue) {
                      form.setValue('leadGiftAmount', undefined as unknown as number);
                      setRows([]);
                      setNotice(null);
                      return;
                    }
                    const nextGoal = Math.max(1, Number(rawValue) || 0);
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
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const showTier = row.level === 1;
                  const nextRow = rows[index + 1];
                  const showSubtotal = !nextRow || nextRow.tier !== row.tier;
                  const subtotal = showSubtotal ? tierSubtotal(rows, row.tier) : null;
                  const isTier3Last = row.tier === 3 && (!nextRow || nextRow.tier !== 3);
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
                        <td className="px-3 py-2">
                          {isTier3Last ? (
                            <div className="flex items-center gap-2">
                              {tier3Rows.length > 1 ? (
                                <button
                                  type="button"
                                  onClick={removeTier3Level}
                                  className="rounded border border-slate-300 px-2 py-0.5 text-xs font-semibold text-slate-700"
                                  title="Remove lowest Tier III level"
                                >
                                  x
                                </button>
                              ) : null}
                              {tier3Rows.length < 3 ? (
                                <button
                                  type="button"
                                  onClick={addTier3Level}
                                  className="rounded border border-brand px-2 py-0.5 text-xs font-semibold text-brand"
                                  title="Add Tier III level"
                                >
                                  +
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </td>
                      </tr>
                      {showSubtotal ? (
                        <tr className="border-b bg-slate-50/70 text-slate-700">
                          <td className="px-3 py-2 text-xs font-semibold" colSpan={5}>
                            gifts yielding a total of
                          </td>
                          <td className="px-3 py-2 text-sm font-semibold">{formatUsd(subtotal ?? 0)}</td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
                {rows.length > 0 ? (
                  <tr className="bg-slate-900 text-white">
                    <td className="px-3 py-2 font-semibold" colSpan={5}>
                      TOTAL GIFTS
                    </td>
                    <td className="px-3 py-2 font-semibold">{formatUsd(total)}</td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-500">
                      Enter project name and campaign goal, then click Regenerate to create the chart.
                    </td>
                  </tr>
                )}
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
          <button className="w-full rounded-lg border border-brand px-3 py-2 text-sm font-semibold text-brand" onClick={resetChart}>
            Reset Chart
          </button>
          <button className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white" onClick={rebalance}>
            Rebalance
          </button>
          {editableHighRangeRows.length > 0 ? (
            <div className="space-y-2 rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Above 1M Ranges</p>
              {editableHighRangeRows.map(({ row, index }) => (
                <label key={row.id} className="block text-xs font-medium text-slate-700">
                  Tier {row.tierLabel} Level {row.level} lower bound
                  <select
                    className="mt-1 w-full rounded border px-2 py-1 text-sm"
                    value={row.lowerBound}
                    onChange={(event) => handleHighRangeEdit(index, Number(event.target.value))}
                  >
                    {highRangeOptions(row.lowerBound, rows[index - 1]?.lowerBound ?? null, safeGoalAmount).map((option) => (
                      <option key={option} value={option}>
                        {formatUsd(option)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          ) : null}
          {secondLastRowMeta ? (
            <div className="space-y-2 rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lower Tier Tuning</p>
              <label className="block text-xs font-medium text-slate-700">
                Tier {secondLastRowMeta.row.tierLabel} Level {secondLastRowMeta.row.level} lower bound
                <select
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  value={secondLastRowMeta.row.lowerBound}
                  onChange={(event) => handleSecondLastRangeEdit(Number(event.target.value))}
                >
                  {secondLastRowMeta.options.map((option) => (
                    <option key={option} value={option}>
                      {formatUsd(option)}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-[11px] text-slate-500">
                The final row auto-updates to the next lower range and rebalances totals.
              </p>
            </div>
          ) : null}
          <p className={`text-sm ${delta === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
            {delta === 0 ? 'Balanced exactly.' : `Out of balance by ${formatUsd(Math.abs(delta))}`}
          </p>
          {notice ? <p className="text-xs text-slate-500">{notice}</p> : null}
        </aside>
      </section>
    </main>
  );
}
