import { useMemo } from 'react';
import { BudgetSummaryCard } from '../components/dashboard/BudgetSummaryCard';
import { CategoryDoughnutChart } from '../components/dashboard/CategoryDoughnutChart';
import { MonthlyTrendChart } from '../components/dashboard/MonthlyTrendChart';
import { SummaryCards } from '../components/dashboard/SummaryCards';
import type { BudgetRecord } from '../types/budget';
import type { CategoryRecord } from '../types/category';
import { buildCategoryBreakdown, buildMonthlyTrend, buildTotals } from '../utils/analytics';
import { buildBudgetSummarySnapshot, buildCategoryBudgetProgress } from '../utils/budgetCalculations';
import { currentMonthKey } from '../utils/date';
import type { MovementRecord } from '../types/movement';

interface DashboardPageProps {
  movements: MovementRecord[];
  allMovements: MovementRecord[];
  categories: CategoryRecord[];
  budgets: BudgetRecord[];
  filterMonthKey: string;
  loading: boolean;
}

export const DashboardPage = ({
  movements,
  allMovements,
  categories,
  budgets,
  filterMonthKey,
  loading,
}: DashboardPageProps) => {
  const totals = useMemo(() => buildTotals(movements), [movements]);
  const categoryBreakdown = useMemo(() => buildCategoryBreakdown(movements), [movements]);
  const monthlyTrend = useMemo(() => buildMonthlyTrend(movements), [movements]);
  const activeBudgetMonth = filterMonthKey === 'all' ? currentMonthKey() : filterMonthKey;
  const budgetProgress = useMemo(
    () => buildCategoryBudgetProgress(categories, budgets, allMovements, activeBudgetMonth),
    [activeBudgetMonth, allMovements, budgets, categories],
  );
  const budgetSummary = useMemo(
    () => buildBudgetSummarySnapshot(budgetProgress, activeBudgetMonth),
    [activeBudgetMonth, budgetProgress],
  );

  if (loading) {
    return (
      <section className="card">
        <p>Cargando movimientos...</p>
      </section>
    );
  }

  return (
    <div className="dashboard-grid">
      <SummaryCards totals={totals} />
      <BudgetSummaryCard summary={budgetSummary} />
      <CategoryDoughnutChart breakdown={categoryBreakdown} />
      <MonthlyTrendChart trend={monthlyTrend} />
    </div>
  );
};
