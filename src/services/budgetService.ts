import { db } from '../db/database';
import type { BudgetDraft, BudgetRecord } from '../types/budget';

const ensureValidMonthKey = (monthKey: string): string => {
  const trimmed = monthKey.trim();
  if (!/^\d{4}-\d{2}$/.test(trimmed)) {
    throw new Error('Selecciona un mes valido.');
  }
  return trimmed;
};

const ensureValidAmount = (amountCents: number): number => {
  const rounded = Math.round(amountCents);
  if (!Number.isFinite(rounded) || rounded <= 0) {
    throw new Error('Ingresa un presupuesto mayor a 0.');
  }
  return rounded;
};

const nowIso = (): string => new Date().toISOString();

export const getAllBudgets = async (): Promise<BudgetRecord[]> => {
  const rows = await db.budgets.toArray();
  return rows.sort((a, b) => {
    const monthCompare = a.monthKey.localeCompare(b.monthKey);
    if (monthCompare !== 0) {
      return monthCompare;
    }
    return a.categoryId - b.categoryId;
  });
};

export const upsertBudget = async (draft: BudgetDraft): Promise<number> => {
  const monthKey = ensureValidMonthKey(draft.monthKey);
  const amountCents = ensureValidAmount(draft.amountCents);

  const category = await db.categories.get(draft.categoryId);
  if (!category?.id) {
    throw new Error('La categoria seleccionada no existe.');
  }

  return db.transaction('rw', db.budgets, async () => {
    const current = await db.budgets
      .where('[monthKey+categoryId]')
      .equals([monthKey, draft.categoryId])
      .first();

    if (current?.id !== undefined) {
      await db.budgets.update(current.id, {
        amountCents,
        updatedAt: nowIso(),
      });
      return current.id;
    }

    const row: Omit<BudgetRecord, 'id'> = {
      categoryId: draft.categoryId,
      monthKey,
      amountCents,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    return db.budgets.add(row);
  });
};

export const deleteBudget = async (id: number): Promise<void> => {
  await db.budgets.delete(id);
};

export const deleteBudgetsByCategoryId = async (categoryId: number): Promise<void> => {
  await db.budgets.where('categoryId').equals(categoryId).delete();
};

export const copyBudgetsToMonth = async (
  sourceMonthKey: string,
  targetMonthKey: string,
): Promise<number> => {
  const source = ensureValidMonthKey(sourceMonthKey);
  const target = ensureValidMonthKey(targetMonthKey);
  if (source === target) {
    throw new Error('El mes origen y destino no pueden ser iguales.');
  }

  return db.transaction('rw', db.budgets, async () => {
    const sourceRows = await db.budgets.where('monthKey').equals(source).toArray();
    if (sourceRows.length === 0) {
      return 0;
    }

    let copied = 0;
    for (const row of sourceRows) {
      const existing = await db.budgets
        .where('[monthKey+categoryId]')
        .equals([target, row.categoryId])
        .first();

      if (existing?.id !== undefined) {
        await db.budgets.update(existing.id, {
          amountCents: row.amountCents,
          updatedAt: nowIso(),
        });
      } else {
        await db.budgets.add({
          categoryId: row.categoryId,
          monthKey: target,
          amountCents: row.amountCents,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        });
      }
      copied += 1;
    }

    return copied;
  });
};
