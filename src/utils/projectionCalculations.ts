import type { MovementRecord } from '../types/movement';
import type { SavingsHealthStatus } from '../types/savingsGoal';
import { currentMonthKey, toMonthKey } from './date';

export type ProjectionMonthState = 'current' | 'past' | 'future';
export type ProjectionDataState = 'projection' | 'final' | 'none';

export interface ProjectionSnapshot {
  monthKey: string;
  monthState: ProjectionMonthState;
  dataState: ProjectionDataState;
  hasData: boolean;
  entriesCount: number;
  daysInMonth: number;
  daysElapsed: number;
  daysRemaining: number;
  incomeMtdCents: number;
  expenseMtdCents: number;
  savingsMtdCents: number;
  projectedIncomeCents: number;
  projectedExpenseCents: number;
  projectedSavingsCents: number;
  averageIncomePerDayCents: number | null;
  averageExpensePerDayCents: number | null;
  targetCents: number | null;
  healthStatus: SavingsHealthStatus;
  gapToTargetCents: number | null;
  targetProgressPercent: number | null;
  maxProjectedExpenseCents: number | null;
  remainingExpenseMarginCents: number | null;
  recommendedDailyExpenseCents: number | null;
}

const MONTH_KEY_PATTERN = /^\d{4}-\d{2}$/;

const parseMonthParts = (monthKey: string): { year: number; monthIndex: number } | null => {
  if (!MONTH_KEY_PATTERN.test(monthKey)) {
    return null;
  }

  const [yearRaw, monthRaw] = monthKey.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  return {
    year,
    monthIndex: month - 1,
  };
};

const getLocalTodayIso = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDayOfMonth = (isoDate: string): number => {
  const dayRaw = isoDate.slice(8, 10);
  const day = Number(dayRaw);
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    return 0;
  }
  return day;
};

const sumByType = (movements: MovementRecord[]): { incomeCents: number; expenseCents: number } => {
  let incomeCents = 0;
  let expenseCents = 0;
  for (const movement of movements) {
    if (movement.type === 'ingreso') {
      incomeCents += movement.amountCents;
    } else {
      expenseCents += movement.amountCents;
    }
  }
  return { incomeCents, expenseCents };
};

const resolveHealthStatus = (
  targetCents: number | null,
  projectedSavingsCents: number,
  hasData: boolean,
): SavingsHealthStatus => {
  if (!targetCents || targetCents <= 0 || !hasData) {
    return 'none';
  }
  if (projectedSavingsCents >= targetCents) {
    return 'ok';
  }
  if (projectedSavingsCents < 0) {
    return 'risk';
  }
  return projectedSavingsCents >= Math.round(targetCents * 0.85) ? 'warning' : 'risk';
};

const resolveProjectionBaseDays = (
  monthState: ProjectionMonthState,
  monthMovements: MovementRecord[],
  daysInMonth: number,
): number => {
  if (monthState === 'past') {
    return daysInMonth;
  }

  if (monthState === 'current') {
    const today = new Date().getDate();
    return Math.max(1, Math.min(today, daysInMonth));
  }

  let maxDay = 0;
  for (const movement of monthMovements) {
    const movementDay = getDayOfMonth(movement.date);
    if (movementDay > maxDay) {
      maxDay = movementDay;
    }
  }
  return maxDay;
};

export const buildProjectionSnapshot = (
  movements: MovementRecord[],
  monthKeyInput: string,
  targetCents: number | null,
): ProjectionSnapshot => {
  const fallbackMonthKey = currentMonthKey();
  const monthKey = MONTH_KEY_PATTERN.test(monthKeyInput) ? monthKeyInput : fallbackMonthKey;
  const monthParts = parseMonthParts(monthKey) ?? parseMonthParts(fallbackMonthKey);

  if (!monthParts) {
    return {
      monthKey: fallbackMonthKey,
      monthState: 'current',
      dataState: 'none',
      hasData: false,
      entriesCount: 0,
      daysInMonth: 30,
      daysElapsed: 0,
      daysRemaining: 30,
      incomeMtdCents: 0,
      expenseMtdCents: 0,
      savingsMtdCents: 0,
      projectedIncomeCents: 0,
      projectedExpenseCents: 0,
      projectedSavingsCents: 0,
      averageIncomePerDayCents: null,
      averageExpensePerDayCents: null,
      targetCents: null,
      healthStatus: 'none',
      gapToTargetCents: null,
      targetProgressPercent: null,
      maxProjectedExpenseCents: null,
      remainingExpenseMarginCents: null,
      recommendedDailyExpenseCents: null,
    };
  }

  const todayIso = getLocalTodayIso();
  const currentKey = currentMonthKey();
  const monthState: ProjectionMonthState =
    monthKey === currentKey ? 'current' : monthKey < currentKey ? 'past' : 'future';
  const daysInMonth = new Date(monthParts.year, monthParts.monthIndex + 1, 0).getDate();

  const monthMovements = movements.filter((movement) => toMonthKey(movement.date) === monthKey);
  const consideredMovements =
    monthState === 'current' ? monthMovements.filter((movement) => movement.date <= todayIso) : monthMovements;

  const entriesCount = consideredMovements.length;
  const hasData = entriesCount > 0;
  const projectionBaseDays = resolveProjectionBaseDays(monthState, consideredMovements, daysInMonth);
  const daysElapsed = Math.min(daysInMonth, Math.max(0, projectionBaseDays));
  const daysRemaining = Math.max(daysInMonth - daysElapsed, 0);

  const mtdTotals = sumByType(consideredMovements);
  const savingsMtdCents = mtdTotals.incomeCents - mtdTotals.expenseCents;

  let projectedIncomeCents = 0;
  let projectedExpenseCents = 0;
  let dataState: ProjectionDataState = 'none';

  if (monthState === 'past') {
    projectedIncomeCents = mtdTotals.incomeCents;
    projectedExpenseCents = mtdTotals.expenseCents;
    dataState = 'final';
  } else if (hasData && daysElapsed > 0) {
    projectedIncomeCents = Math.round((mtdTotals.incomeCents / daysElapsed) * daysInMonth);
    projectedExpenseCents = Math.round((mtdTotals.expenseCents / daysElapsed) * daysInMonth);
    dataState = 'projection';
  }

  const projectedSavingsCents = projectedIncomeCents - projectedExpenseCents;
  const averageIncomePerDayCents =
    hasData && daysElapsed > 0 ? Math.round(mtdTotals.incomeCents / daysElapsed) : null;
  const averageExpensePerDayCents =
    hasData && daysElapsed > 0 ? Math.round(mtdTotals.expenseCents / daysElapsed) : null;

  const normalizedTargetCents =
    targetCents !== null && Number.isFinite(targetCents) && targetCents > 0 ? Math.round(targetCents) : null;
  const healthStatus = resolveHealthStatus(normalizedTargetCents, projectedSavingsCents, hasData);
  const gapToTargetCents = normalizedTargetCents === null || !hasData ? null : projectedSavingsCents - normalizedTargetCents;
  const targetProgressPercent =
    normalizedTargetCents === null || !hasData || normalizedTargetCents === 0
      ? null
      : Math.round((projectedSavingsCents / normalizedTargetCents) * 100);

  const maxProjectedExpenseCents =
    normalizedTargetCents === null || !hasData ? null : projectedIncomeCents - normalizedTargetCents;
  const remainingExpenseMarginCents =
    maxProjectedExpenseCents === null ? null : maxProjectedExpenseCents - mtdTotals.expenseCents;
  const recommendedDailyExpenseCents =
    maxProjectedExpenseCents === null || monthState === 'past' || daysRemaining === 0
      ? null
      : Math.round((maxProjectedExpenseCents - mtdTotals.expenseCents) / daysRemaining);

  return {
    monthKey,
    monthState,
    dataState,
    hasData,
    entriesCount,
    daysInMonth,
    daysElapsed,
    daysRemaining,
    incomeMtdCents: mtdTotals.incomeCents,
    expenseMtdCents: mtdTotals.expenseCents,
    savingsMtdCents,
    projectedIncomeCents,
    projectedExpenseCents,
    projectedSavingsCents,
    averageIncomePerDayCents,
    averageExpensePerDayCents,
    targetCents: normalizedTargetCents,
    healthStatus,
    gapToTargetCents,
    targetProgressPercent,
    maxProjectedExpenseCents,
    remainingExpenseMarginCents,
    recommendedDailyExpenseCents,
  };
};
