import { db } from '../db/database';
import { DEFAULT_CATEGORY_NAME } from '../constants/options';
import { ensureCategoriesExist, ensureCategoryExists } from './categoryService';
import type { MovementDraft, MovementRecord } from '../types/movement';

const sanitizeNote = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const normalizeCategoryName = (value: string): string => {
  return value.trim().replace(/\s+/g, ' ');
};

const categoryNameToLower = (value: string): string => {
  return normalizeCategoryName(value).toLocaleLowerCase('es-AR');
};

const sanitizeCategory = (value: string): string => {
  const normalized = normalizeCategoryName(value);
  return normalized ? normalized : DEFAULT_CATEGORY_NAME;
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

const resolveCanonicalCategoryName = async (inputCategory: string): Promise<string> => {
  const normalizedCategory = sanitizeCategory(inputCategory);
  const existingCategory = await db.categories
    .where('nameLower')
    .equals(categoryNameToLower(normalizedCategory))
    .first();

  return existingCategory?.name ?? normalizedCategory;
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
  const canonicalCategory = await resolveCanonicalCategoryName(draft.category);
  await ensureCategoryExists(canonicalCategory, draft.type);
  return db.movements.add(
    buildRecord({
      ...draft,
      category: canonicalCategory,
    }),
  );
};

export const updateMovement = async (id: number, draft: MovementDraft): Promise<void> => {
  const current = await db.movements.get(id);
  if (!current) {
    throw new Error('No se encontró el movimiento que intentaste editar.');
  }

  const canonicalCategory = await resolveCanonicalCategoryName(draft.category);
  const dueDate = sanitizeDueDate(draft.dueDate);
  const reminderFlags = sanitizeReminderFlags(draft);
  const shouldRemind = Boolean(dueDate && reminderFlags.isPaymentReminder);
  await ensureCategoryExists(canonicalCategory, draft.type);

  await db.movements.update(id, {
    ...draft,
    category: canonicalCategory,
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

  const categoryInputsByLower = new Map<string, string>();
  for (const item of sanitized) {
    const category = sanitizeCategory(item.category);
    const lower = categoryNameToLower(category);
    if (!categoryInputsByLower.has(lower)) {
      categoryInputsByLower.set(lower, category);
    }
  }

  const categoryInputs = [...categoryInputsByLower.values()];
  await ensureCategoriesExist(
    categoryInputs.map((name) => ({
      name,
      typeHint: 'both',
    })),
  );

  await db.transaction('rw', db.movements, db.categories, async () => {
    if (strategy === 'replace') {
      await db.movements.clear();
    }

    const categories = await db.categories.toArray();
    const categoryNameMap = new Map(categories.map((category) => [category.nameLower, category.name]));
    const now = new Date().toISOString();
    const rows: Omit<MovementRecord, 'id'>[] = sanitized.map((item) => {
      const dueDate = sanitizeDueDate(item.dueDate);
      const reminderFlags = sanitizeReminderFlags(item);
      const shouldRemind = Boolean(dueDate && reminderFlags.isPaymentReminder);
      const normalizedCategory = sanitizeCategory(item.category);
      const canonicalCategory =
        categoryNameMap.get(categoryNameToLower(normalizedCategory)) ?? normalizedCategory;

      return {
        ...item,
        category: canonicalCategory,
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
