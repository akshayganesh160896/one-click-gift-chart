import { describe, expect, it } from 'vitest';
import { applySecondLastRangeOverride, generateGiftChart, rebalanceGiftChart, rowsTotal } from '@/lib/giftChart';

describe('gift chart rebalancing', () => {
  it('matches campaign goal exactly for default generation', () => {
    const goal = 5000000;
    const rows = generateGiftChart(goal, 3);
    expect(rowsTotal(rows)).toBe(goal);
  });

  it('stays exact after manual count edit + rebalance', () => {
    const goal = 2500000;
    const rows = generateGiftChart(goal, 3);
    rows[3].giftCount = 20;
    const result = rebalanceGiftChart(rows, goal, [3]);
    expect(rowsTotal(result.rows)).toBe(goal);
  });

  it('supports 4 tiers', () => {
    const goal = 12000000;
    const rows = generateGiftChart(goal, 4);
    expect(rows.length).toBe(12);
    expect(rowsTotal(rows)).toBe(goal);
  });

  it('uses approved post-250k range ladders', () => {
    const highGoalRows = generateGiftChart(10000000, 4);
    const highBounds = highGoalRows.map((row) => row.lowerBound);
    const idx250High = highBounds.indexOf(250000);
    expect(idx250High).toBeGreaterThan(-1);
    expect(highBounds.slice(idx250High, idx250High + 5)).toEqual([250000, 100000, 75000, 50000, 25000]);

    const midGoalRows = generateGiftChart(3000000, 3);
    const midBounds = midGoalRows.map((row) => row.lowerBound);
    const idx250Mid = midBounds.indexOf(250000);
    expect(idx250Mid).toBeGreaterThan(-1);
    expect(midBounds.slice(idx250Mid, idx250Mid + 4)).toEqual([250000, 100000, 50000, 25000]);
  });

  it('locks major campaigns to 1M+ tier 1 bottom and fixed tier 2 ranges', () => {
    const rows = generateGiftChart(30000000, 3);
    const bounds = rows.map((row) => row.lowerBound);

    expect(bounds[2]).toBe(1000000);
    expect(bounds[3]).toBe(500000);
    expect(bounds[4]).toBe(250000);
    expect(bounds[5]).toBe(100000);
    expect(bounds[7]).toBe(25000);
    expect(bounds[8]).toBe(10000);
  });

  it('keeps major campaign counts within 2x growth and weighted tier mix', () => {
    const goal = 30000000;
    const rows = generateGiftChart(goal, 3);
    expect(rowsTotal(rows)).toBe(goal);

    for (let i = 1; i < rows.length; i += 1) {
      expect(rows[i].giftCount).toBeGreaterThanOrEqual(rows[i - 1].giftCount);
      expect(rows[i].giftCount).toBeLessThanOrEqual(rows[i - 1].giftCount * 2);
    }

    const tier1 = rows.slice(0, 3).reduce((s, r) => s + r.giftCount * r.lowerBound, 0) / goal;
    const tier2 = rows.slice(3, 6).reduce((s, r) => s + r.giftCount * r.lowerBound, 0) / goal;
    const tier3 = rows.slice(6, 9).reduce((s, r) => s + r.giftCount * r.lowerBound, 0) / goal;

    expect(tier1).toBeGreaterThanOrEqual(0.5);
    expect(tier1).toBeLessThanOrEqual(0.6);
    expect(tier2).toBeGreaterThanOrEqual(0.3);
    expect(tier2).toBeLessThanOrEqual(0.4);
    expect(tier3).toBeLessThanOrEqual(0.15);
  });

  it('prefers even gift counts and 1,2,4 pattern in major campaigns', () => {
    const rows = generateGiftChart(20000000, 3);
    const counts = rows.map((row) => row.giftCount);

    expect(counts[0]).toBe(1);
    expect(counts[1]).toBe(2);
    expect([3, 4]).toContain(counts[2]);

    const evenCountRatio =
      counts.slice(1).filter((count) => count % 2 === 0).length / counts.slice(1).length;
    expect(evenCountRatio).toBeGreaterThanOrEqual(0.75);

    for (let i = 1; i < counts.length; i += 1) {
      expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
      expect(counts[i]).toBeLessThanOrEqual(counts[i - 1] * 2);
    }
  });

  it('uses elevated tier ranges for campaigns above 30m', () => {
    const rows = generateGiftChart(40000000, 3);
    const bounds = rows.map((row) => row.lowerBound);
    expect(bounds.slice(0, 9)).toEqual([8000000, 4000000, 2000000, 1000000, 500000, 250000, 100000, 50000, 25000]);
  });

  it('raises the lowest tier floor for very large campaigns', () => {
    const rows = generateGiftChart(100000000, 3);
    const bounds = rows.map((row) => row.lowerBound);
    expect(bounds[8]).toBeGreaterThanOrEqual(100000);
    expect(bounds[7]).toBeGreaterThanOrEqual(200000);
  });

  it('uses the requested 1M lead ladder for major campaigns', () => {
    const rows = generateGiftChart(20000000, 3, 1000000);
    const bounds = rows.map((row) => row.lowerBound);
    expect(bounds).toEqual([1000000, 750000, 500000, 250000, 100000, 75000, 50000, 25000, 10000]);
    expect(rowsTotal(rows)).toBe(20000000);
  });

  it('lets second-last range drive the final range and preserves exact totals', () => {
    const goal = 20000000;
    const rows = generateGiftChart(goal, 3, 1000000);
    const result = applySecondLastRangeOverride(rows, 10000, goal);
    const updatedBounds = result.rows.map((row) => row.lowerBound);
    expect(updatedBounds[7]).toBe(10000);
    expect(updatedBounds[8]).toBe(5000);
    expect(rowsTotal(result.rows)).toBe(goal);
  });
});
