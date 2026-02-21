export type MovementType = 'ingreso' | 'gasto';
export type MovementTypeFilter = 'all' | MovementType;

export interface MovementRecord {
  id?: number;
  type: MovementType;
  amountCents: number;
  category: string;
  date: string;
  dueDate?: string;
  isBill?: boolean;
  isPaymentReminder?: boolean;
  paymentMethod: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MovementDraft {
  type: MovementType;
  amountCents: number;
  category: string;
  date: string;
  dueDate?: string;
  isBill?: boolean;
  isPaymentReminder?: boolean;
  paymentMethod: string;
  note?: string;
}

export interface MovementFilters {
  month: string;
  category: string;
  type: MovementTypeFilter;
}

export interface TotalsSnapshot {
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
}

export interface CategoryBreakdownItem {
  category: string;
  cents: number;
}

export interface MonthlyTrendItem {
  month: string;
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
}
