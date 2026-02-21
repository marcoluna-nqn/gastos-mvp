import type { ProjectionSnapshot } from '../../utils/projectionCalculations';
import { formatArs } from '../../utils/currency';
import { formatMonthLabel } from '../../utils/date';

interface ProjectionCardProps {
  snapshot: ProjectionSnapshot;
  usingCurrentMonthFallback: boolean;
  onConfigureGoal: () => void;
}

const clampProgress = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, value));
};

const resolveStatusLabel = (snapshot: ProjectionSnapshot): string => {
  if (snapshot.healthStatus === 'ok') {
    return 'OK';
  }
  if (snapshot.healthStatus === 'warning') {
    return 'Atencion';
  }
  if (snapshot.healthStatus === 'risk') {
    return 'Riesgo';
  }
  return snapshot.targetCents ? 'Sin datos' : 'Sin objetivo';
};

const resolveMainText = (snapshot: ProjectionSnapshot): string => {
  if (!snapshot.hasData) {
    if (snapshot.monthState === 'future') {
      return 'No hay datos para proyectar este mes futuro.';
    }
    if (snapshot.monthState === 'past') {
      return 'Mes cerrado sin movimientos registrados.';
    }
    return 'Aun no hay movimientos cargados este mes.';
  }

  if (snapshot.monthState === 'past') {
    return `Resultado final del mes: ${formatArs(snapshot.projectedSavingsCents)} de ahorro.`;
  }

  if (snapshot.monthState === 'future') {
    return `Con los datos cargados, cerrarias el mes con ${formatArs(snapshot.projectedSavingsCents)} de ahorro.`;
  }

  return `Si seguis asi, terminas el mes con ${formatArs(snapshot.projectedSavingsCents)} de ahorro.`;
};

export const ProjectionCard = ({ snapshot, usingCurrentMonthFallback, onConfigureGoal }: ProjectionCardProps) => {
  const progressPercent =
    snapshot.targetCents && snapshot.targetCents > 0 && snapshot.hasData
      ? clampProgress((snapshot.projectedSavingsCents / snapshot.targetCents) * 100)
      : 0;

  const gapLabel =
    snapshot.targetCents === null
      ? 'Sin objetivo configurado'
      : snapshot.gapToTargetCents === null
        ? 'Sin datos suficientes para comparar con el objetivo'
      : snapshot.gapToTargetCents >= 0
        ? `Vas ${formatArs(snapshot.gapToTargetCents)} arriba del objetivo`
        : `Te faltan ${formatArs(Math.abs(snapshot.gapToTargetCents))} para llegar`;

  return (
    <article className="card projection-card">
      <header className="section-header">
        <h2>Proyeccion del mes</h2>
        <div className="projection-header-actions">
          <span className="budget-month-pill">{formatMonthLabel(snapshot.monthKey)}</span>
          <button type="button" className="button button-secondary compact" onClick={onConfigureGoal}>
            Objetivo de ahorro
          </button>
        </div>
      </header>

      {usingCurrentMonthFallback ? <p className="projection-context">Filtro en "Todos los meses": usando mes actual.</p> : null}

      <p className="projection-main-text">{resolveMainText(snapshot)}</p>

      <div className="projection-top-grid">
        <div>
          <p className="summary-label">Objetivo</p>
          <strong className="summary-value">
            {snapshot.targetCents !== null ? formatArs(snapshot.targetCents) : 'Sin objetivo'}
          </strong>
        </div>
        <div>
          <p className="summary-label">Semaforo</p>
          <span className={`projection-status projection-status-${snapshot.healthStatus}`}>{resolveStatusLabel(snapshot)}</span>
        </div>
      </div>

      {snapshot.targetCents !== null ? (
        <div className="projection-meter" role="presentation">
          <span style={{ width: `${progressPercent}%` }} />
        </div>
      ) : null}

      <p className="projection-gap-text">{gapLabel}</p>

      <div className="projection-kpis">
        <p>
          Ingresos MTD: <strong>{formatArs(snapshot.incomeMtdCents)}</strong>
        </p>
        <p>
          Gastos MTD: <strong>{formatArs(snapshot.expenseMtdCents)}</strong>
        </p>
        <p>
          Ritmo gasto diario: <strong>{snapshot.averageExpensePerDayCents !== null ? formatArs(snapshot.averageExpensePerDayCents) : 'Sin datos'}</strong>
        </p>
        <p>
          Ingresos proyectados: <strong>{formatArs(snapshot.projectedIncomeCents)}</strong>
        </p>
        <p>
          Gastos proyectados: <strong>{formatArs(snapshot.projectedExpenseCents)}</strong>
        </p>
        <p>
          Ahorro proyectado: <strong>{formatArs(snapshot.projectedSavingsCents)}</strong>
        </p>
      </div>

      {snapshot.targetCents !== null && snapshot.hasData ? (
        <div className="projection-actions">
          <p>
            Margen de gasto restante: <strong>{snapshot.remainingExpenseMarginCents !== null ? formatArs(snapshot.remainingExpenseMarginCents) : 'N/A'}</strong>
          </p>
          <p>
            Gasto diario recomendado:{' '}
            <strong>
              {snapshot.recommendedDailyExpenseCents !== null ? formatArs(snapshot.recommendedDailyExpenseCents) : 'N/A'}
            </strong>
          </p>
          <p>
            Dias considerados: <strong>{snapshot.daysElapsed}</strong> de <strong>{snapshot.daysInMonth}</strong>
          </p>
        </div>
      ) : null}
    </article>
  );
};
