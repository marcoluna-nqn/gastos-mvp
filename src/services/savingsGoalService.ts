import { db } from '../db/database';
import type { SavingsGoalDraft, SavingsGoalRecord } from '../types/savingsGoal';

const MONTH_KEY_PATTERN = /^\d{4}-\d{2}$/;

const nowIso = (): string => new Date().toISOString();

const ensureValidMonthKey = (monthKey: string): string => {
  const normalized = monthKey.trim();
  if (!MONTH_KEY_PATTERN.test(normalized)) {
    throw new Error('Selecciona un mes valido.');
  }
  return normalized;
};

const ensureValidTarget = (targetCents: number): number => {
  const normalized = Math.round(targetCents);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error('Ingresa un objetivo de ahorro mayor a 0.');
  }
  return normalized;
};

export const getAllSavingsGoals = async (): Promise<SavingsGoalRecord[]> => {
  const rows = await db.savingsGoals.toArray();
  return rows.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
};

export const upsertSavingsGoal = async (draft: SavingsGoalDraft): Promise<number> => {
  const monthKey = ensureValidMonthKey(draft.monthKey);
  const targetCents = ensureValidTarget(draft.targetCents);

  return db.transaction('rw', db.savingsGoals, async () => {
    const existing = await db.savingsGoals.where('monthKey').equals(monthKey).first();

    if (existing?.id !== undefined) {
      await db.savingsGoals.update(existing.id, {
        targetCents,
        updatedAt: nowIso(),
      });
      return existing.id;
    }

    return db.savingsGoals.add({
      monthKey,
      targetCents,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  });
};

export const deleteSavingsGoal = async (id: number): Promise<void> => {
  await db.savingsGoals.delete(id);
};

export const deleteSavingsGoalByMonth = async (monthKey: string): Promise<void> => {
  const normalized = ensureValidMonthKey(monthKey);
  await db.savingsGoals.where('monthKey').equals(normalized).delete();
};
