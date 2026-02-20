import type { MovementFilters, MovementRecord } from '../types/movement';
import { toMonthKey } from './date';

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
  const normalized = search.trim().toLowerCase();
  if (!normalized) {
    return movements;
  }

  return movements.filter((movement) => {
    return (
      movement.category.toLowerCase().includes(normalized) ||
      movement.paymentMethod.toLowerCase().includes(normalized) ||
      movement.note?.toLowerCase().includes(normalized) ||
      movement.date.includes(normalized)
    );
  });
};
