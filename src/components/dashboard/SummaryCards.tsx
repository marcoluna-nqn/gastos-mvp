import type { TotalsSnapshot } from '../../types/movement';
import { formatArs } from '../../utils/currency';

interface SummaryCardsProps {
  totals: TotalsSnapshot;
}

export const SummaryCards = ({ totals }: SummaryCardsProps) => {
  return (
    <section className="summary-grid" aria-label="Resumen financiero">
      <article className="card summary-card">
        <p className="summary-label">Ingresos</p>
        <strong className="summary-value income">{formatArs(totals.incomeCents)}</strong>
      </article>

      <article className="card summary-card">
        <p className="summary-label">Gastos</p>
        <strong className="summary-value expense">{formatArs(totals.expenseCents)}</strong>
      </article>

      <article className="card summary-card">
        <p className="summary-label">Balance</p>
        <strong className={`summary-value ${totals.balanceCents >= 0 ? 'income' : 'expense'}`}>
          {formatArs(totals.balanceCents)}
        </strong>
      </article>
    </section>
  );
};
