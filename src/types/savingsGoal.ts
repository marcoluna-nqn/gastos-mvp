export interface SavingsGoalRecord {
  id?: number;
  monthKey: string;
  targetCents: number;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsGoalDraft {
  monthKey: string;
  targetCents: number;
}

export type SavingsHealthStatus = 'ok' | 'warning' | 'risk' | 'none';
