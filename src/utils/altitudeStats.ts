import type { BlockTemplate, WeeklyPlan } from '../types';

export function sumCompletedHoursByCategory(
  plans: WeeklyPlan[],
  templates: BlockTemplate[]
): Record<string, number> {
  const catTotals: Record<string, number> = {};
  const templatesById = new Map<string, BlockTemplate>();
  for (const template of templates) {
    if (!templatesById.has(template.id)) templatesById.set(template.id, template);
  }

  plans.forEach((plan) => {
    plan.blocks?.forEach((b) => {
      if (!b.done) return;
      let catId: string | null | undefined = null;
      let duration: number | undefined = 0;
      if (b.isOneOff) {
        catId = b.oneOffCategoryId;
        duration = b.oneOffDuration;
      } else if (b.templateId) {
        const t = templatesById.get(b.templateId);
        if (t) {
          catId = t.categoryId;
          duration = t.durationHours;
        }
      }
      if (catId && duration) {
        catTotals[catId] = (catTotals[catId] || 0) + duration;
      }
    });
  });

  return catTotals;
}
