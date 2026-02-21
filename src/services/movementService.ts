import { db } from '../db/database';
import { DEFAULT_CATEGORY_NAME } from '../constants/options';
import { ensureCategoriesExist, ensureCategoryExists } from './categoryService';
import type { MovementDraft, MovementRecord } from '../types/movement';

const sanitizeNote = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const sanitizeCategory = (value: string): string => {
  const trimmed = value.trim();
  return trimmed ? trimmed : DEFAULT_CATEGORY_NAME;
};

const sanitizeDueDate = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : undefined;
};

const sanitizeReminderFlags = (
  draft: Pick<MovementDraft, 'isBill' | 'isPaymentReminder'>,
): { isBill: boolean; isPaymentReminder: boolean } => {
  const reminder = Boolean(draft.isPaymentReminder ?? draft.isBill ?? false);
  return {
    isBill: reminder,
    isPaymentReminder: reminder,
  };
};

const buildRecord = (draft: MovementDraft): Omit<MovementRecord, 'id'> => {
  const timestamp = new Date().toISOString();
  const dueDate = sanitizeDueDate(draft.dueDate);
  const reminderFlags = sanitizeReminderFlags(draft);
  const shouldRemind = Boolean(dueDate && reminderFlags.isPaymentReminder);
  return {
    ...draft,
    category: sanitizeCategory(draft.category),
    dueDate,
    isBill: shouldRemind,
    isPaymentReminder: shouldRemind,
    note: sanitizeNote(draft.note),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

export const getAllMovements = async (): Promise<MovementRecord[]> => {
  const rows = await db.movements.toArray();
  return rows.sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) {
      return dateCompare;
    }

    return (b.id ?? 0) - (a.id ?? 0);
  });
};

export const createMovement = async (draft: MovementDraft): Promise<number> => {
  const normalizedCategory = sanitizeCategory(draft.category);
  await ensureCategoryExists(normalizedCategory, draft.type);
  return db.movements.add(buildRecord(draft));
};

export const updateMovement = async (id: number, draft: MovementDraft): Promise<void> => {
  const current = await db.movements.get(id);
  if (!current) {
    throw new Error('No se encontró el movimiento que intentaste editar.');
  }

  const normalizedCategory = sanitizeCategory(draft.category);
  const dueDate = sanitizeDueDate(draft.dueDate);
  const reminderFlags = sanitizeReminderFlags(draft);
  const shouldRemind = Boolean(dueDate && reminderFlags.isPaymentReminder);
  await ensureCategoryExists(normalizedCategory, draft.type);

  await db.movements.update(id, {
    ...draft,
    category: normalizedCategory,
    dueDate,
    isBill: shouldRemind,
    isPaymentReminder: shouldRemind,
    note: sanitizeNote(draft.note),
    updatedAt: new Date().toISOString(),
  });
};

export const deleteMovement = async (id: number): Promise<void> => {
  await db.movements.delete(id);
};

export const clearMovements = async (): Promise<void> => {
  await db.movements.clear();
};

const ensureUnique = (items: MovementDraft[]): MovementDraft[] => {
  return items.filter((item) => item.amountCents > 0);
};

export const importMovements = async (
  items: MovementDraft[],
  strategy: 'merge' | 'replace',
): Promise<number> => {
  const sanitized = ensureUnique(items);
  if (sanitized.length === 0) {
    return 0;
  }

  const categoryInputs = [...new Set(sanitized.map((item) => sanitizeCategory(item.category)))];
  await ensureCategoriesExist(
    categoryInputs.map((name) => ({
      name,
      typeHint: 'both',
    })),
  );

  await db.transaction('rw', db.movements, async () => {
    if (strategy === 'replace') {
      await db.movements.clear();
    }

    const now = new Date().toISOString();
    const rows: Omit<MovementRecord, 'id'>[] = sanitized.map((item) => {
      const dueDate = sanitizeDueDate(item.dueDate);
      const reminderFlags = sanitizeReminderFlags(item);
      const shouldRemind = Boolean(dueDate && reminderFlags.isPaymentReminder);

      return {
        ...item,
        category: sanitizeCategory(item.category),
        dueDate,
        isBill: shouldRemind,
        isPaymentReminder: shouldRemind,
        note: sanitizeNote(item.note),
        createdAt: now,
        updatedAt: now,
      };
    });

    await db.movements.bulkAdd(rows);
  });

  return sanitized.length;
};
