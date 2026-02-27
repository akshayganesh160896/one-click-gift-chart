import { describe, expect, it } from 'vitest';
import { generateGiftChart, rebalanceGiftChart, rowsTotal } from '@/lib/giftChart';

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
});
