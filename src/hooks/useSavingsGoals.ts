import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  deleteSavingsGoal,
  deleteSavingsGoalByMonth,
  getAllSavingsGoals,
  upsertSavingsGoal,
} from '../services/savingsGoalService';
import type { SavingsGoalDraft } from '../types/savingsGoal';

export const useSavingsGoals = () => {
  const goals = useLiveQuery(() => getAllSavingsGoals(), []);

  const saveGoal = useCallback((draft: SavingsGoalDraft) => upsertSavingsGoal(draft), []);
  const removeGoal = useCallback((id: number) => deleteSavingsGoal(id), []);
  const removeGoalByMonth = useCallback((monthKey: string) => deleteSavingsGoalByMonth(monthKey), []);

  return {
    loading: goals === undefined,
    savingsGoals: goals ?? [],
    saveSavingsGoal: saveGoal,
    deleteSavingsGoal: removeGoal,
    deleteSavingsGoalByMonth: removeGoalByMonth,
  };
};
