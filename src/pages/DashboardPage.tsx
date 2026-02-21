import { useMemo, useState } from 'react';
import { BudgetSummaryCard } from '../components/dashboard/BudgetSummaryCard';
import { CategoryDoughnutChart } from '../components/dashboard/CategoryDoughnutChart';
import { MonthlyTrendChart } from '../components/dashboard/MonthlyTrendChart';
import { ProjectionCard } from '../components/dashboard/ProjectionCard';
import { SummaryCards } from '../components/dashboard/SummaryCards';
import { SavingsGoalModal } from '../components/goals/SavingsGoalModal';
import type { BudgetRecord } from '../types/budget';
import type { CategoryRecord } from '../types/category';
import type { SavingsGoalDraft, SavingsGoalRecord } from '../types/savingsGoal';
import { buildCategoryBreakdown, buildMonthlyTrend, buildTotals } from '../utils/analytics';
import { buildBudgetSummarySnapshot, buildCategoryBudgetProgress } from '../utils/budgetCalculations';
import { currentMonthKey } from '../utils/date';
import type { MovementRecord } from '../types/movement';
import { buildProjectionSnapshot } from '../utils/projectionCalculations';

interface DashboardPageProps {
  movements: MovementRecord[];
  allMovements: MovementRecord[];
  categories: CategoryRecord[];
  budgets: BudgetRecord[];
  savingsGoals: SavingsGoalRecord[];
  filterMonthKey: string;
  loading: boolean;
  onSaveSavingsGoal: (draft: SavingsGoalDraft) => Promise<unknown>;
  onDeleteSavingsGoalByMonth: (monthKey: string) => Promise<void>;
}

export const DashboardPage = ({
  movements,
  allMovements,
  categories,
  budgets,
  savingsGoals,
  filterMonthKey,
  loading,
  onSaveSavingsGoal,
  onDeleteSavingsGoalByMonth,
}: DashboardPageProps) => {
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const totals = useMemo(() => buildTotals(movements), [movements]);
  const categoryBreakdown = useMemo(() => buildCategoryBreakdown(movements), [movements]);
  const monthlyTrend = useMemo(() => buildMonthlyTrend(movements), [movements]);
  const activeMonthKey = filterMonthKey === 'all' ? currentMonthKey() : filterMonthKey;
  const budgetProgress = useMemo(
    () => buildCategoryBudgetProgress(categories, budgets, allMovements, activeMonthKey),
    [activeMonthKey, allMovements, budgets, categories],
  );
  const budgetSummary = useMemo(
    () => buildBudgetSummarySnapshot(budgetProgress, activeMonthKey),
    [activeMonthKey, budgetProgress],
  );
  const goalForActiveMonth = useMemo(
    () => savingsGoals.find((goal) => goal.monthKey === activeMonthKey) ?? null,
    [activeMonthKey, savingsGoals],
  );
  const projection = useMemo(
    () => buildProjectionSnapshot(allMovements, activeMonthKey, goalForActiveMonth?.targetCents ?? null),
    [activeMonthKey, allMovements, goalForActiveMonth?.targetCents],
  );

  if (loading) {
    return (
      <section className="card">
        <p>Cargando movimientos...</p>
      </section>
    );
  }

  return (
    <>
      <div className="dashboard-grid">
        <SummaryCards totals={totals} />
        <BudgetSummaryCard summary={budgetSummary} />
        <ProjectionCard
          snapshot={projection}
          usingCurrentMonthFallback={filterMonthKey === 'all'}
          onConfigureGoal={() => setGoalModalOpen(true)}
        />
        <CategoryDoughnutChart breakdown={categoryBreakdown} />
        <MonthlyTrendChart trend={monthlyTrend} />
      </div>

      <SavingsGoalModal
        open={goalModalOpen}
        defaultMonthKey={activeMonthKey}
        goals={savingsGoals}
        onClose={() => setGoalModalOpen(false)}
        onSaveGoal={onSaveSavingsGoal}
        onDeleteGoalByMonth={onDeleteSavingsGoalByMonth}
      />
    </>
  );
};
