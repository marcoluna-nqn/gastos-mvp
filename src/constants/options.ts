import type { MovementFilters } from '../types/movement';

export const INITIAL_CATEGORIES = [
  'Comida',
  'Transporte',
  'Alquiler',
  'Servicios',
  'Salud',
  'Ocio',
  'Sueldo',
  'Otros',
] as const;

export const INITIAL_PAYMENT_METHODS = [
  'Efectivo',
  'Débito',
  'Crédito',
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
