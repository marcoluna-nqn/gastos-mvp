import type { BudgetSummarySnapshot } from '../../utils/budgetCalculations';
import { formatArs } from '../../utils/currency';
import { formatMonthLabel } from '../../utils/date';

interface BudgetSummaryCardProps {
  summary: BudgetSummarySnapshot;
}

export const BudgetSummaryCard = ({ summary }: BudgetSummaryCardProps) => {
  const usagePercent =
    summary.totalBudgetCents > 0
      ? Math.min(100, Math.round((summary.totalSpentCents / summary.totalBudgetCents) * 100))
      : 0;

  return (
    <article className="card budget-summary-card">
      <header className="section-header">
        <h2>Presupuesto del mes</h2>
        <span className="budget-month-pill">{formatMonthLabel(summary.monthKey)}</span>
      </header>

      <div className="budget-summary-grid">
        <div>
          <p className="summary-label">Presupuestado</p>
          <strong className="summary-value">{formatArs(summary.totalBudgetCents)}</strong>
        </div>
        <div>
          <p className="summary-label">Gastado</p>
          <strong className={`summary-value ${summary.totalSpentCents > summary.totalBudgetCents ? 'expense' : ''}`}>
            {formatArs(summary.totalSpentCents)}
          </strong>
        </div>
      </div>

      <div className="budget-meter">
        <span style={{ width: `${usagePercent}%` }} />
      </div>

      <div className="budget-summary-stats">
        <p>
          Excedidas: <strong>{summary.exceededCount}</strong>
        </p>
        <p>
          En alerta: <strong>{summary.warningCount}</strong>
        </p>
        <p>
          Sin presupuesto: <strong>{summary.noBudgetCount}</strong>
        </p>
      </div>
    </article>
  );
};
