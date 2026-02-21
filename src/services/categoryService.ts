import { db } from '../db/database';
import { DEFAULT_CATEGORY_NAME, DEFAULT_CATEGORY_SEED } from '../constants/options';
import type { CategoryRecord, CategoryType } from '../types/category';
import type { MovementType } from '../types/movement';

const normalizeCategoryName = (name: string): string => {
  return name.trim().replace(/\s+/g, ' ');
};

const categoryNameToLower = (name: string): string => {
  return normalizeCategoryName(name).toLocaleLowerCase('es-AR');
};

const nowIso = (): string => new Date().toISOString();

const buildCategoryRecord = (
  name: string,
  type: CategoryType,
  options: { isDefault: boolean; createdAt?: string; updatedAt?: string },
): Omit<CategoryRecord, 'id'> => {
  const normalizedName = normalizeCategoryName(name);
  const timestamp = nowIso();
  return {
    name: normalizedName,
    nameLower: categoryNameToLower(normalizedName),
    type,
    isDefault: options.isDefault,
    createdAt: options.createdAt ?? timestamp,
    updatedAt: options.updatedAt ?? timestamp,
  };
};

const resolveTypeFromMovementType = (movementType: MovementType | 'both'): CategoryType => {
  if (movementType === 'both') {
    return 'both';
  }

  return movementType;
};

const ensureFallbackCategoryInTransaction = async (): Promise<CategoryRecord> => {
  const fallbackLower = categoryNameToLower(DEFAULT_CATEGORY_NAME);
  const existing = await db.categories.where('nameLower').equals(fallbackLower).first();
  if (existing) {
    return existing;
  }

  const record = buildCategoryRecord(DEFAULT_CATEGORY_NAME, 'both', { isDefault: true });
  const id = await db.categories.add(record);
  return {
    ...record,
    id,
  };
};

export const getAllCategories = async (): Promise<CategoryRecord[]> => {
  const categories = await db.categories.toArray();
  return categories.sort((a, b) => a.name.localeCompare(b.name, 'es'));
};

export const ensureDefaultCategories = async (): Promise<void> => {
  await db.transaction('rw', db.categories, async () => {
    for (const seed of DEFAULT_CATEGORY_SEED) {
      const normalized = normalizeCategoryName(seed.name);
      if (!normalized) {
        continue;
      }

      const nameLower = categoryNameToLower(normalized);
      const existing = await db.categories.where('nameLower').equals(nameLower).first();
      if (existing) {
        if (!existing.isDefault && seed.isDefault) {
          await db.categories.update(existing.id!, {
            isDefault: true,
            updatedAt: nowIso(),
          });
        }
        continue;
      }

      await db.categories.add(buildCategoryRecord(normalized, seed.type, { isDefault: seed.isDefault }));
    }
  });
};

export const ensureCategoryExists = async (
  name: string,
  typeHint: MovementType | 'both' = 'both',
): Promise<CategoryRecord> => {
  const normalizedName = normalizeCategoryName(name);
  if (!normalizedName) {
    return ensureFallbackCategoryInTransaction();
  }

  const nameLower = categoryNameToLower(normalizedName);
  return db.transaction('rw', db.categories, async () => {
    const existing = await db.categories.where('nameLower').equals(nameLower).first();
    if (existing) {
      return existing;
    }

    const record = buildCategoryRecord(normalizedName, resolveTypeFromMovementType(typeHint), {
      isDefault: false,
    });
    const id = await db.categories.add(record);
    return { ...record, id };
  });
};

export const ensureCategoriesExist = async (
  entries: Array<{ name: string; typeHint?: MovementType | 'both' }>,
): Promise<void> => {
  for (const entry of entries) {
    await ensureCategoryExists(entry.name, entry.typeHint ?? 'both');
  }
};

export const createCategory = async (name: string, type: CategoryType = 'both'): Promise<number> => {
  const normalizedName = normalizeCategoryName(name);
  if (!normalizedName) {
    throw new Error('Ingresa un nombre de categoria valido.');
  }

  const nameLower = categoryNameToLower(normalizedName);
  const existing = await db.categories.where('nameLower').equals(nameLower).first();
  if (existing) {
    throw new Error('La categoria ya existe.');
  }

  return db.categories.add(buildCategoryRecord(normalizedName, type, { isDefault: false }));
};

export const updateCategory = async (
  id: number,
  payload: { name: string; type: CategoryType },
): Promise<void> => {
  const category = await db.categories.get(id);
  if (!category) {
    throw new Error('No se encontro la categoria seleccionada.');
  }

  const normalizedName = normalizeCategoryName(payload.name);
  if (!normalizedName) {
    throw new Error('Ingresa un nombre de categoria valido.');
  }

  const nameLower = categoryNameToLower(normalizedName);
  const collision = await db.categories.where('nameLower').equals(nameLower).first();
  if (collision && collision.id !== id) {
    throw new Error('Ya existe otra categoria con ese nombre.');
  }

  await db.transaction('rw', db.categories, db.movements, async () => {
    const previousName = category.name;
    await db.categories.update(id, {
      name: normalizedName,
      nameLower,
      type: payload.type,
      updatedAt: nowIso(),
    });

    if (previousName !== normalizedName) {
      await db.movements.where('category').equals(previousName).modify({
        category: normalizedName,
        updatedAt: nowIso(),
      });
    }
  });
};

export const deleteCategoryAndReassign = async (id: number): Promise<void> => {
  await db.transaction('rw', db.categories, db.movements, async () => {
    const category = await db.categories.get(id);
    if (!category) {
      throw new Error('No se encontro la categoria seleccionada.');
    }

    if (category.nameLower === categoryNameToLower(DEFAULT_CATEGORY_NAME)) {
      throw new Error('No se puede eliminar la categoria de respaldo.');
    }

    const fallback = await ensureFallbackCategoryInTransaction();
    await db.movements.where('category').equalsIgnoreCase(category.name).modify({
      category: fallback.name,
      updatedAt: nowIso(),
    });

    await db.categories.delete(id);
  });
};

export const filterCategoryNamesByMovementType = (
  categories: CategoryRecord[],
  movementType: MovementType,
): string[] => {
  return categories
    .filter((category) => category.type === 'both' || category.type === movementType)
    .map((category) => category.name)
    .sort((a, b) => a.localeCompare(b, 'es'));
};
