export const goalInMillionsLabel = (goalAmount: number): string => {
  const millions = goalAmount / 1_000_000;
  const rounded = Math.round(millions * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}M` : `${rounded}M`;
};

export const exportBaseName = (projectName: string, goalAmount: number): string => {
  const safeProject = projectName.trim().replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ');
  return `${safeProject} ${goalInMillionsLabel(goalAmount)} Gift Chart`.trim();
};
