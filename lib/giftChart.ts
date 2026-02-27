import { ChartRow, RebalanceResult, TierLabel } from '@/lib/types';

const TIER_LABELS: TierLabel[] = ['I', 'II', 'III', 'IV'];
const DEFAULT_COUNTS_3 = [1, 2, 4, 6, 8, 10, 12, 14, 16];
const DEFAULT_COUNTS_4 = [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 22, 26];
const MAJOR_CAMPAIGN_MIN_GOAL = 20000000;
const MAJOR_FIXED_BOUNDS = [1000000, 500000, 250000, 100000];

export const rowsTotal = (rows: ChartRow[]) =>
  rows.reduce((sum, row) => sum + row.giftCount * row.lowerBound, 0);

export const buildRangeText = (row: ChartRow): string => {
  if (row.upperBound === null) {
    return `${formatUsd(row.lowerBound)} or more`;
  }
  return `${formatUsd(row.lowerBound)} to ${formatUsd(row.upperBound)}`;
};

export const formatUsd = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);

const orderedStepCandidates = (max: number, min = 1): number[] => {
  const steps = [250000, 100000, 75000, 50000, 25000, 10000, 5000, 1000, 500, 100, 50, 10, 5, 1];
  return steps.filter((step) => step <= max && step >= min);
};

const chooseTailPattern = (goalAmount: number) => {
  if (goalAmount >= 5000000) {
    return [100000, 75000, 50000, 25000, 10000];
  }
  return [100000, 50000, 25000, 10000];
};

const nextBoundFromTail = (previousBound: number, goalAmount: number): number => {
  const pattern = chooseTailPattern(goalAmount);
  const index = pattern.indexOf(previousBound);
  if (index >= 0 && index < pattern.length - 1) {
    return pattern[index + 1];
  }

  if (previousBound > 250000) return 250000;
  if (previousBound > 100000) return 100000;
  if (previousBound > 75000 && pattern.includes(75000)) return 75000;
  if (previousBound > 50000) return 50000;
  if (previousBound > 25000) return 25000;
  if (previousBound > 10000) return 10000;

  const halved = Math.max(1000, Math.round(previousBound / 2 / 1000) * 1000);
  return halved;
};

const roundToNearest = (value: number, step: number) => Math.max(step, Math.round(value / step) * step);

const buildMajorCampaignBounds = (lead: number, levelCount: number): number[] => {
  const bounds: number[] = [];
  const cleanTail = [50000, 25000, 10000, 5000, 1000];
  bounds.push(lead);
  bounds.push(Math.max(2000000, roundToNearest(lead / 2, 50000)));
  bounds.push(MAJOR_FIXED_BOUNDS[0]);
  bounds.push(MAJOR_FIXED_BOUNDS[1]);
  bounds.push(MAJOR_FIXED_BOUNDS[2]);
  bounds.push(MAJOR_FIXED_BOUNDS[3]);

  while (bounds.length < levelCount) {
    const previous = bounds[bounds.length - 1];
    const tailIndex = cleanTail.indexOf(previous);
    if (tailIndex >= 0 && tailIndex < cleanTail.length - 1) {
      bounds.push(cleanTail[tailIndex + 1]);
    } else {
      bounds.push(Math.max(1000, Math.round(previous / 2 / 1000) * 1000));
    }
  }

  return bounds.slice(0, levelCount);
};

const solveTier3Exact = (
  remaining: number,
  bounds: [number, number, number],
  minFirstCount: number
): [number, number, number] | null => {
  for (let n1 = minFirstCount; n1 <= minFirstCount * 2; n1 += 1) {
    for (let n2 = n1; n2 <= n1 * 2; n2 += 1) {
      const rem = remaining - n1 * bounds[0] - n2 * bounds[1];
      if (rem < 0 || rem % bounds[2] !== 0) continue;
      const n3 = rem / bounds[2];
      if (n3 >= n2 && n3 <= n2 * 2) {
        return [n1, n2, n3];
      }
    }
  }
  return null;
};

const solveMajorCampaignCounts = (rows: ChartRow[], goalAmount: number): number[] | null => {
  if (rows.length < 9) return null;
  const bounds = rows.map((row) => row.lowerBound);
  let best: number[] | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let n1 = 1; n1 <= 4; n1 += 1) {
    for (let n2 = n1; n2 <= n1 * 2; n2 += 1) {
      for (let n3 = n2; n3 <= n2 * 2; n3 += 1) {
        for (let n4 = n3; n4 <= n3 * 2; n4 += 1) {
          for (let n5 = n4; n5 <= n4 * 2; n5 += 1) {
            for (let n6 = n5; n6 <= n5 * 2; n6 += 1) {
              const tier1 = n1 * bounds[0] + n2 * bounds[1] + n3 * bounds[2];
              const tier2 = n4 * bounds[3] + n5 * bounds[4] + n6 * bounds[5];
              const tier1Share = tier1 / goalAmount;
              const tier2Share = tier2 / goalAmount;

              const remaining = goalAmount - tier1 - tier2;
              if (remaining <= 0) continue;
              const tier3 = solveTier3Exact(remaining, [bounds[6], bounds[7], bounds[8]], n6);
              if (!tier3) continue;

              const tier3Share = remaining / goalAmount;
              const score =
                Math.abs(tier1Share - 0.45) + Math.abs(tier2Share - 0.35) + Math.abs(tier3Share - 0.1);
              if (score < bestScore) {
                bestScore = score;
                best = [n1, n2, n3, n4, n5, n6, tier3[0], tier3[1], tier3[2]];
              }
            }
          }
        }
      }
    }
  }

  return best;
};

const buildLowerBounds = (lead: number, levelCount: number, goalAmount: number): number[] => {
  if (goalAmount >= MAJOR_CAMPAIGN_MIN_GOAL && levelCount >= 6) {
    return buildMajorCampaignBounds(lead, levelCount);
  }

  const bounds: number[] = [lead];
  for (let i = 1; i < levelCount; i += 1) {
    const previous = bounds[i - 1];
    const next =
      previous > 500000
        ? Math.max(250000, Math.round(previous / 2 / 1000) * 1000)
        : nextBoundFromTail(previous, goalAmount);
    bounds.push(next);
  }
  return bounds;
};

const findExactLastAllocation = (
  remaining: number,
  minCount: number,
  maxLowerBound: number,
  minLowerBound: number
): { count: number; lowerBound: number } => {
  if (remaining <= 0) {
    return { count: minCount, lowerBound: minLowerBound };
  }

  for (const step of orderedStepCandidates(maxLowerBound, minLowerBound)) {
    if (remaining % step === 0) {
      const count = remaining / step;
      if (count >= minCount) {
        return { count, lowerBound: step };
      }
    }
  }

  // When no exact fit exists at normal denomination steps, we relax to the
  // configured floor (10k for major templates, $1 otherwise).
  const safeCount = Math.max(minCount, remaining);
  const safeLower = Math.max(minLowerBound, Math.floor(remaining / safeCount));
  const correctedCount = Math.max(minCount, Math.floor(remaining / safeLower));
  return {
    count: correctedCount,
    lowerBound: Math.max(minLowerBound, Math.floor(remaining / correctedCount))
  };
};

const cloneRows = (rows: ChartRow[]) => rows.map((row) => ({ ...row }));
const forceExactWithDollarFloor = (rows: ChartRow[], goalAmount: number, lastIndex: number) => {
  const subtotalWithoutLast = rows
    .slice(0, lastIndex)
    .reduce((sum, row) => sum + row.giftCount * row.lowerBound, 0);
  rows[lastIndex].lowerBound = 1;
  rows[lastIndex].giftCount = Math.max(1, goalAmount - subtotalWithoutLast);
};

const solveLastTwoCountsExact = (
  remaining: number,
  secondLastBound: number,
  lastBound: number,
  secondLastMin: number,
  secondLastMax: number
): { secondLastCount: number; lastCount: number } | null => {
  for (let secondLastCount = secondLastMin; secondLastCount <= secondLastMax; secondLastCount += 1) {
    const rem = remaining - secondLastCount * secondLastBound;
    if (rem < 0 || rem % lastBound !== 0) continue;
    const lastCount = rem / lastBound;
    if (lastCount >= secondLastCount && lastCount <= secondLastCount * 2) {
      return { secondLastCount, lastCount };
    }
  }
  return null;
};

export const generateGiftChart = (goalAmount: number, tiersCount: 3 | 4, leadGiftAmount?: number): ChartRow[] => {
  const levelCount = tiersCount * 3;
  const lead = Math.max(1, Math.round(leadGiftAmount ?? goalAmount * 0.2));
  const defaults = tiersCount === 3 ? DEFAULT_COUNTS_3 : DEFAULT_COUNTS_4;
  const lowerBounds = buildLowerBounds(lead, levelCount, goalAmount);

  const rows: ChartRow[] = [];

  for (let index = 0; index < levelCount; index += 1) {
    const tier = Math.floor(index / 3) + 1;
    const level = (index % 3) + 1;
    const lowerBound = lowerBounds[index];

    rows.push({
      id: `r-${tier}-${level}`,
      tier,
      tierLabel: TIER_LABELS[tier - 1],
      level,
      lowerBound,
      upperBound: null,
      giftCount: defaults[index] ?? defaults[defaults.length - 1]
    });
  }

  for (let i = 1; i < rows.length; i += 1) {
    rows[i].upperBound = rows[i - 1].lowerBound - 1;
  }

  if (goalAmount >= MAJOR_CAMPAIGN_MIN_GOAL && tiersCount === 3) {
    const solvedCounts = solveMajorCampaignCounts(rows, goalAmount);
    if (solvedCounts) {
      for (let i = 0; i < 9; i += 1) {
        rows[i].giftCount = solvedCounts[i];
      }
    }
  }

  return rebalanceGiftChart(rows, goalAmount).rows;
};

export const rebalanceGiftChart = (
  inputRows: ChartRow[],
  goalAmount: number,
  lockedIndices: number[] = []
): RebalanceResult => {
  const rows = cloneRows(inputRows);
  const locked = new Set(lockedIndices);
  let warning: string | undefined;
  const isMajorCampaign = goalAmount >= MAJOR_CAMPAIGN_MIN_GOAL && rows.length >= 9;
  const minLowerBound = isMajorCampaign ? 10000 : 1;

  if (isMajorCampaign && lockedIndices.length === 0) {
    const solvedCounts = solveMajorCampaignCounts(rows, goalAmount);
    if (solvedCounts) {
      for (let i = 0; i < 9; i += 1) {
        rows[i].giftCount = solvedCounts[i];
      }
      for (let i = 1; i < rows.length; i += 1) {
        rows[i].upperBound = rows[i - 1].lowerBound - 1;
      }
      rows[0].upperBound = null;
      return { rows, warning };
    }
  }

  for (let i = 1; i < rows.length; i += 1) {
    if (rows[i].giftCount < rows[i - 1].giftCount) {
      rows[i].giftCount = rows[i - 1].giftCount;
      if (locked.has(i)) {
        warning = 'Some locked values were adjusted to maintain non-decreasing gift counts.';
      }
    }
    if (isMajorCampaign) {
      const maxAllowed = rows[i - 1].giftCount * 2;
      if (rows[i].giftCount > maxAllowed) {
        rows[i].giftCount = maxAllowed;
        if (locked.has(i)) {
          warning = 'Some locked values were adjusted to keep count growth within 2x per level.';
        }
      }
    }
  }

  const lastIndex = rows.length - 1;
  const minLastCount = Math.max(rows[lastIndex - 1]?.giftCount ?? 1, rows[lastIndex].giftCount);

  let subtotalWithoutLast = rows
    .slice(0, lastIndex)
    .reduce((sum, row) => sum + row.giftCount * row.lowerBound, 0);

  let remaining = goalAmount - subtotalWithoutLast;

  if (remaining < minLastCount * rows[lastIndex].lowerBound) {
    for (let i = lastIndex - 1; i >= 0 && remaining < minLastCount * rows[lastIndex].lowerBound; i -= 1) {
      if (locked.has(i)) {
        continue;
      }
      const minForRow = i === 0 ? 1 : rows[i - 1].giftCount;
      while (rows[i].giftCount > minForRow && remaining < minLastCount * rows[lastIndex].lowerBound) {
        rows[i].giftCount -= 1;
        subtotalWithoutLast -= rows[i].lowerBound;
        remaining = goalAmount - subtotalWithoutLast;
      }
    }
  }

  if (remaining <= 0) {
    rows[lastIndex].giftCount = minLastCount;
    rows[lastIndex].lowerBound = isMajorCampaign
      ? rows[lastIndex].lowerBound
      : Math.max(minLowerBound, rows[lastIndex].lowerBound);
  } else {
    if (isMajorCampaign) {
      rows[lastIndex].giftCount = Math.max(minLastCount, Math.floor(remaining / rows[lastIndex].lowerBound));
    } else {
      const maxLowerBound = Math.max(1, rows[lastIndex - 1]?.lowerBound ?? rows[lastIndex].lowerBound);
      const allocation = findExactLastAllocation(remaining, minLastCount, maxLowerBound, minLowerBound);
      rows[lastIndex].giftCount = allocation.count;
      rows[lastIndex].lowerBound = allocation.lowerBound;
    }
  }

  for (let i = 1; i < rows.length; i += 1) {
    rows[i].upperBound = rows[i - 1].lowerBound - 1;
  }
  rows[0].upperBound = null;

  if (isMajorCampaign && rows.length >= 2) {
    const secondLastIndex = lastIndex - 1;
    const subtotalWithoutLastTwo = rows
      .slice(0, secondLastIndex)
      .reduce((sum, row) => sum + row.giftCount * row.lowerBound, 0);
    const exact = solveLastTwoCountsExact(
      goalAmount - subtotalWithoutLastTwo,
      rows[secondLastIndex].lowerBound,
      rows[lastIndex].lowerBound,
      rows[secondLastIndex - 1]?.giftCount ?? 1,
      (rows[secondLastIndex - 1]?.giftCount ?? 1) * 2
    );
    if (exact) {
      rows[secondLastIndex].giftCount = exact.secondLastCount;
      rows[lastIndex].giftCount = exact.lastCount;
    }
  } else {
    const finalTotal = rowsTotal(rows);
    if (finalTotal !== goalAmount) {
      const diff = goalAmount - finalTotal;
      if (diff % rows[lastIndex].lowerBound === 0) {
        rows[lastIndex].giftCount += diff / rows[lastIndex].lowerBound;
      } else {
        forceExactWithDollarFloor(rows, goalAmount, lastIndex);
      }
    }
  }

  const safeTotal = rowsTotal(rows);
  if (safeTotal !== goalAmount) {
    if (!isMajorCampaign) {
      forceExactWithDollarFloor(rows, goalAmount, lastIndex);
    }
  }

  return { rows, warning };
};

export const updateLeadGiftAndRebalance = (
  rows: ChartRow[],
  newLeadGift: number,
  goalAmount: number
): RebalanceResult => {
  const next = cloneRows(rows);
  const normalizedLead = Math.max(1, Math.round(newLeadGift));
  const lowerBounds = buildLowerBounds(normalizedLead, next.length, goalAmount);
  for (let i = 0; i < next.length; i += 1) {
    next[i].lowerBound = lowerBounds[i];
    if (i > 0) {
      next[i].upperBound = next[i - 1].lowerBound - 1;
    }
  }

  return rebalanceGiftChart(next, goalAmount);
};

export const tierSubtotal = (rows: ChartRow[], tier: number): number =>
  rows.filter((row) => row.tier === tier).reduce((sum, row) => sum + row.giftCount * row.lowerBound, 0);
