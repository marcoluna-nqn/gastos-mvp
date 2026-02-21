import type { MovementFilters, MovementRecord } from '../types/movement';
import { toMonthKey } from './date';

const REMINDER_SEARCH_ALIASES = [
  'recordatorio',
  'recordatorios',
  'vencimiento',
  'vencimientos',
  'pago',
  'pagos',
] as const;

const normalizeSearchValue = (value: string): string => {
  return value
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const matchesReminderAlias = (normalizedSearch: string): boolean => {
  const tokens = normalizedSearch.split(/\s+/).filter(Boolean);
  return tokens.some((token) => {
    if (token.length < 3) {
      return false;
    }

    return REMINDER_SEARCH_ALIASES.some(
      (alias) => alias.includes(token) || token.includes(alias),
    );
  });
};

export const applyMovementFilters = (
  movements: MovementRecord[],
  filters: MovementFilters,
): MovementRecord[] => {
  return movements.filter((movement) => {
    if (filters.month !== 'all' && toMonthKey(movement.date) !== filters.month) {
      return false;
    }

    if (filters.category !== 'all' && movement.category !== filters.category) {
      return false;
    }

    if (filters.type !== 'all' && movement.type !== filters.type) {
      return false;
    }

    return true;
  });
};

export const applySearchFilter = (movements: MovementRecord[], search: string): MovementRecord[] => {
  const normalized = normalizeSearchValue(search);
  if (!normalized) {
    return movements;
  }

  const matchesReminderSearch = matchesReminderAlias(normalized);

  return movements.filter((movement) => {
    return (
      normalizeSearchValue(movement.category).includes(normalized) ||
      normalizeSearchValue(movement.paymentMethod).includes(normalized) ||
      normalizeSearchValue(movement.note ?? '').includes(normalized) ||
      movement.date.includes(normalized) ||
      movement.dueDate?.includes(normalized) ||
      ((movement.isPaymentReminder || movement.isBill) &&
        matchesReminderSearch)
    );
  });
};
