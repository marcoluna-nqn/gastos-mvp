import { db } from '../db/database';
import type { MovementDraft, MovementRecord } from '../types/movement';

const sanitizeNote = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const buildRecord = (draft: MovementDraft): Omit<MovementRecord, 'id'> => {
  const timestamp = new Date().toISOString();
  return {
    ...draft,
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
  return db.movements.add(buildRecord(draft));
};

export const updateMovement = async (id: number, draft: MovementDraft): Promise<void> => {
  const current = await db.movements.get(id);
  if (!current) {
    throw new Error('No se encontró el movimiento que intentaste editar.');
  }

  await db.movements.update(id, {
    ...draft,
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

  await db.transaction('rw', db.movements, async () => {
    if (strategy === 'replace') {
      await db.movements.clear();
    }

    const now = new Date().toISOString();
    const rows: Omit<MovementRecord, 'id'>[] = sanitized.map((item) => ({
      ...item,
      note: sanitizeNote(item.note),
      createdAt: now,
      updatedAt: now,
    }));

    await db.movements.bulkAdd(rows);
  });

  return sanitized.length;
};
