import { useMemo } from 'react';
import { CategoryDoughnutChart } from '../components/dashboard/CategoryDoughnutChart';
import { MonthlyTrendChart } from '../components/dashboard/MonthlyTrendChart';
import { SummaryCards } from '../components/dashboard/SummaryCards';
import { buildCategoryBreakdown, buildMonthlyTrend, buildTotals } from '../utils/analytics';
import type { MovementRecord } from '../types/movement';

interface DashboardPageProps {
  movements: MovementRecord[];
  loading: boolean;
}

export const DashboardPage = ({ movements, loading }: DashboardPageProps) => {
  const totals = useMemo(() => buildTotals(movements), [movements]);
  const categoryBreakdown = useMemo(() => buildCategoryBreakdown(movements), [movements]);
  const monthlyTrend = useMemo(() => buildMonthlyTrend(movements), [movements]);

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
      <CategoryDoughnutChart breakdown={categoryBreakdown} />
      <MonthlyTrendChart trend={monthlyTrend} />
    </div>
  );
};
