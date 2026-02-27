import { z } from 'zod';

export const chartRowSchema = z.object({
  id: z.string(),
  tier: z.number().int().min(1).max(4),
  tierLabel: z.enum(['I', 'II', 'III', 'IV']),
  level: z.number().int().min(1).max(3),
  lowerBound: z.number().int().min(1),
  upperBound: z.number().int().nullable(),
  giftCount: z.number().int().min(1)
});

export const chartSchema = z.object({
  projectName: z.string().min(1),
  goalAmount: z.number().int().min(1),
  tiersCount: z.union([z.literal(3), z.literal(4)]),
  leadGiftAmount: z.number().int().min(1),
  rows: z.array(chartRowSchema).min(9).max(12)
}).superRefine((data, ctx) => {
  if (data.rows.length !== data.tiersCount * 3) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Row count must match tier count * 3.',
      path: ['rows']
    });
  }
});

export type ChartInput = z.infer<typeof chartSchema>;
