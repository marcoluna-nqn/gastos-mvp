import type { MovementRecord } from '../types/movement';

const DAY_MS = 24 * 60 * 60 * 1000;

export type DueStatus = 'overdue' | 'today' | 'tomorrow' | 'next7';

export interface UpcomingReminderItem {
  movement: MovementRecord;
  dueDate: string;
  daysUntilDue: number;
  status: DueStatus;
}

const toUtcDate = (isoDate: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return null;
  }

  const [year, month, day] = isoDate.split('-').map((value) => Number(value));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
};

const getDueStatusFromDiff = (daysUntilDue: number): DueStatus | null => {
  if (daysUntilDue < 0) {
    return 'overdue';
  }
  if (daysUntilDue === 0) {
    return 'today';
  }
  if (daysUntilDue === 1) {
    return 'tomorrow';
  }
  if (daysUntilDue <= 7) {
    return 'next7';
  }
  return null;
};

const STATUS_ORDER: Record<DueStatus, number> = {
  overdue: 0,
  today: 1,
  tomorrow: 2,
  next7: 3,
};

export const isReminderMovement = (movement: MovementRecord): boolean => {
  return Boolean(movement.isPaymentReminder ?? movement.isBill ?? false);
};

export const buildUpcomingReminderItems = (
  movements: MovementRecord[],
  todayIsoDate: string,
): UpcomingReminderItem[] => {
  const todayDate = toUtcDate(todayIsoDate);
  if (!todayDate) {
    return [];
  }

  const reminders: UpcomingReminderItem[] = [];

  for (const movement of movements) {
    if (!movement.dueDate || !isReminderMovement(movement)) {
      continue;
    }

    const dueDate = toUtcDate(movement.dueDate);
    if (!dueDate) {
      continue;
    }

    const daysUntilDue = Math.round((dueDate.getTime() - todayDate.getTime()) / DAY_MS);
    const status = getDueStatusFromDiff(daysUntilDue);
    if (!status) {
      continue;
    }

    reminders.push({
      movement,
      dueDate: movement.dueDate,
      daysUntilDue,
      status,
    });
  }

  reminders.sort((left, right) => {
    const statusDiff = STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
    if (statusDiff !== 0) {
      return statusDiff;
    }

    const dueDateDiff = left.dueDate.localeCompare(right.dueDate);
    if (dueDateDiff !== 0) {
      return dueDateDiff;
    }

    return (right.movement.id ?? 0) - (left.movement.id ?? 0);
  });

  return reminders;
};

export const resolveDueStatus = (dueDateIso: string, todayIsoDate: string): DueStatus | null => {
  const dueDate = toUtcDate(dueDateIso);
  const todayDate = toUtcDate(todayIsoDate);
  if (!dueDate || !todayDate) {
    return null;
  }

  const daysUntilDue = Math.round((dueDate.getTime() - todayDate.getTime()) / DAY_MS);
  return getDueStatusFromDiff(daysUntilDue);
};

export const getDueStatusLabel = (status: DueStatus): string => {
  if (status === 'overdue') {
    return 'Vencido';
  }
  if (status === 'today') {
    return 'Vence hoy';
  }
  if (status === 'tomorrow') {
    return 'Vence manana';
  }
  return 'Proximos 7 dias';
};
