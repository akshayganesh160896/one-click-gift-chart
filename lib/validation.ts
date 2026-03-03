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
  rows: z.array(chartRowSchema).min(7).max(12)
}).superRefine((data, ctx) => {
  const maxRows = data.tiersCount * 3;
  const minRows = maxRows - 2;
  if (data.rows.length > maxRows || data.rows.length < minRows) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Row count must be within allowed range for selected tiers.',
      path: ['rows']
    });
  }
});

export type ChartInput = z.infer<typeof chartSchema>;
