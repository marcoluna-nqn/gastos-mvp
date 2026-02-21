export interface BudgetRecord {
  id?: number;
  categoryId: number;
  monthKey: string;
  amountCents: number;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetDraft {
  categoryId: number;
  monthKey: string;
  amountCents: number;
}

export type BudgetHealthStatus = 'ok' | 'warning' | 'exceeded' | 'none';
