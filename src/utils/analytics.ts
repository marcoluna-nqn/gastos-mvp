import type {
  CategoryBreakdownItem,
  MonthlyTrendItem,
  MovementRecord,
  TotalsSnapshot,
} from '../types/movement';
import { toMonthKey } from './date';

export const buildTotals = (movements: MovementRecord[]): TotalsSnapshot => {
  const snapshot = movements.reduce<TotalsSnapshot>(
    (accumulator, movement) => {
      if (movement.type === 'ingreso') {
        accumulator.incomeCents += movement.amountCents;
      } else {
        accumulator.expenseCents += movement.amountCents;
      }

      return accumulator;
    },
    { incomeCents: 0, expenseCents: 0, balanceCents: 0 },
  );

  snapshot.balanceCents = snapshot.incomeCents - snapshot.expenseCents;
  return snapshot;
};

export const buildCategoryBreakdown = (movements: MovementRecord[]): CategoryBreakdownItem[] => {
  const byCategory = new Map<string, number>();

  for (const movement of movements) {
    if (movement.type !== 'gasto') {
      continue;
    }

    const previous = byCategory.get(movement.category) ?? 0;
    byCategory.set(movement.category, previous + movement.amountCents);
  }

  return [...byCategory.entries()]
    .map(([category, cents]) => ({ category, cents }))
    .sort((a, b) => b.cents - a.cents);
};

export const buildMonthlyTrend = (movements: MovementRecord[]): MonthlyTrendItem[] => {
  const byMonth = new Map<string, MonthlyTrendItem>();

  for (const movement of movements) {
    const month = toMonthKey(movement.date);
    const current = byMonth.get(month) ?? {
      month,
      incomeCents: 0,
      expenseCents: 0,
      balanceCents: 0,
    };

    if (movement.type === 'ingreso') {
      current.incomeCents += movement.amountCents;
    } else {
      current.expenseCents += movement.amountCents;
    }

    current.balanceCents = current.incomeCents - current.expenseCents;
    byMonth.set(month, current);
  }

  return [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
};
