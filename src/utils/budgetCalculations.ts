import type { BudgetHealthStatus, BudgetRecord } from '../types/budget';
import type { CategoryRecord } from '../types/category';
import type { MovementRecord } from '../types/movement';
import { toMonthKey } from './date';

export interface CategoryBudgetProgress {
  categoryId: number;
  categoryName: string;
  budgetId?: number;
  budgetCents: number;
  spentCents: number;
  remainingCents: number;
  usedPercent: number;
  status: BudgetHealthStatus;
}

export interface BudgetSummarySnapshot {
  monthKey: string;
  totalBudgetCents: number;
  totalSpentCents: number;
  exceededCount: number;
  warningCount: number;
  okCount: number;
  noBudgetCount: number;
  totalTrackedCategories: number;
}

const resolveStatus = (budgetCents: number, spentCents: number): BudgetHealthStatus => {
  if (budgetCents <= 0) {
    return 'none';
  }

  const usage = (spentCents / budgetCents) * 100;
  if (usage >= 100) {
    return 'exceeded';
  }
  if (usage >= 80) {
    return 'warning';
  }
  return 'ok';
};

const roundPercent = (value: number): number => {
  return Math.round(value * 100) / 100;
};

const buildSpentMapForMonth = (movements: MovementRecord[], monthKey: string): Map<string, number> => {
  const byCategory = new Map<string, number>();
  for (const movement of movements) {
    if (movement.type !== 'gasto') {
      continue;
    }
    if (toMonthKey(movement.date) !== monthKey) {
      continue;
    }

    const key = movement.category.toLocaleLowerCase('es-AR');
    const current = byCategory.get(key) ?? 0;
    byCategory.set(key, current + movement.amountCents);
  }

  return byCategory;
};

export const buildCategoryBudgetProgress = (
  categories: CategoryRecord[],
  budgets: BudgetRecord[],
  movements: MovementRecord[],
  monthKey: string,
): CategoryBudgetProgress[] => {
  const activeCategories = categories.filter(
    (category): category is CategoryRecord & { id: number } =>
      category.id !== undefined && (category.type === 'both' || category.type === 'gasto'),
  );
  const budgetMap = new Map<number, BudgetRecord>();
  for (const budget of budgets) {
    if (budget.monthKey !== monthKey) {
      continue;
    }
    budgetMap.set(budget.categoryId, budget);
  }

  const spentByCategoryName = buildSpentMapForMonth(movements, monthKey);

  return activeCategories
    .map((category) => {
      const budget = category.id !== undefined ? budgetMap.get(category.id) : undefined;
      const spentCents = spentByCategoryName.get(category.nameLower) ?? 0;
      const budgetCents = budget?.amountCents ?? 0;
      const usedPercent = budgetCents > 0 ? roundPercent((spentCents / budgetCents) * 100) : 0;
      const status = resolveStatus(budgetCents, spentCents);
      return {
        categoryId: category.id,
        categoryName: category.name,
        budgetId: budget?.id,
        budgetCents,
        spentCents,
        remainingCents: budgetCents - spentCents,
        usedPercent,
        status,
      };
    })
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName, 'es'));
};

export const buildBudgetSummarySnapshot = (
  progressItems: CategoryBudgetProgress[],
  monthKey: string,
): BudgetSummarySnapshot => {
  const summary = {
    monthKey,
    totalBudgetCents: 0,
    totalSpentCents: 0,
    exceededCount: 0,
    warningCount: 0,
    okCount: 0,
    noBudgetCount: 0,
    totalTrackedCategories: progressItems.length,
  };

  for (const entry of progressItems) {
    summary.totalBudgetCents += entry.budgetCents;
    summary.totalSpentCents += entry.spentCents;
    if (entry.status === 'exceeded') {
      summary.exceededCount += 1;
    } else if (entry.status === 'warning') {
      summary.warningCount += 1;
    } else if (entry.status === 'ok') {
      summary.okCount += 1;
    } else {
      summary.noBudgetCount += 1;
    }
  }

  return summary;
};
