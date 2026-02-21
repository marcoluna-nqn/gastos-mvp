import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { copyBudgetsToMonth, deleteBudget, getAllBudgets, upsertBudget } from '../services/budgetService';
import type { BudgetDraft } from '../types/budget';

export const useBudgets = () => {
  const budgets = useLiveQuery(() => getAllBudgets(), []);

  const saveBudget = useCallback((draft: BudgetDraft) => upsertBudget(draft), []);
  const removeBudget = useCallback((id: number) => deleteBudget(id), []);
  const copyMonth = useCallback((sourceMonthKey: string, targetMonthKey: string) => copyBudgetsToMonth(sourceMonthKey, targetMonthKey), []);

  return {
    loading: budgets === undefined,
    budgets: budgets ?? [],
    saveBudget,
    deleteBudget: removeBudget,
    copyBudgetsToMonth: copyMonth,
  };
};
