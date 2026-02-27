export type TierLabel = 'I' | 'II' | 'III' | 'IV';

export type ChartRow = {
  id: string;
  tier: number;
  tierLabel: TierLabel;
  level: number;
  lowerBound: number;
  upperBound: number | null;
  giftCount: number;
};

export type GiftChartPayload = {
  projectName: string;
  goalAmount: number;
  tiersCount: 3 | 4;
  leadGiftAmount: number;
  rows: ChartRow[];
};

export type RebalanceResult = {
  rows: ChartRow[];
  warning?: string;
};
