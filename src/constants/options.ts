import type { CategorySeed } from '../types/category';
import type { MovementFilters } from '../types/movement';

export const DEFAULT_CATEGORY_NAME = 'Otros';

export const DEFAULT_CATEGORY_SEED: readonly CategorySeed[] = [
  { name: 'Comida', type: 'gasto', isDefault: true },
  { name: 'Transporte', type: 'gasto', isDefault: true },
  { name: 'Alquiler', type: 'gasto', isDefault: true },
  { name: 'Servicios', type: 'gasto', isDefault: true },
  { name: 'Salud', type: 'gasto', isDefault: true },
  { name: 'Ocio', type: 'gasto', isDefault: true },
  { name: 'Sueldo', type: 'ingreso', isDefault: true },
  { name: DEFAULT_CATEGORY_NAME, type: 'both', isDefault: true },
] as const;

export const INITIAL_PAYMENT_METHODS = [
  'Efectivo',
  'Debito',
  'Credito',
  'Transferencia',
  'Billetera virtual',
] as const;

export const DEFAULT_FILTERS: MovementFilters = {
  month: 'all',
  category: 'all',
  type: 'all',
};

export const DATABASE_NAME = 'gastos-mvp-db';
export const CURRENCY_LOCALE = 'es-AR';
export const CURRENCY_CODE = 'ARS';
