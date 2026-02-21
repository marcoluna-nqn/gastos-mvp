import Dexie, { type Table } from 'dexie';
import { DATABASE_NAME, DEFAULT_CATEGORY_SEED } from '../constants/options';
import type { CategoryRecord } from '../types/category';
import type { MovementRecord } from '../types/movement';

class GastosDatabase extends Dexie {
  movements!: Table<MovementRecord, number>;
  categories!: Table<CategoryRecord, number>;

  constructor() {
    super(DATABASE_NAME);

    this.version(1).stores({
      movements: '++id, type, category, date, paymentMethod, amountCents, createdAt',
    });

    this.version(2)
      .stores({
        movements: '++id, type, category, date, paymentMethod, amountCents, createdAt',
        categories: '++id, &nameLower, name, type, isDefault, createdAt, updatedAt',
      })
      .upgrade(async (tx) => {
        const categoriesTable = tx.table('categories') as Table<CategoryRecord, number>;
        const movementsTable = tx.table('movements') as Table<MovementRecord, number>;

        const now = new Date().toISOString();
        const byNameLower = new Map<string, Omit<CategoryRecord, 'id'>>();

        const rememberCategory = (name: string, type: CategoryRecord['type'], isDefault: boolean) => {
          const normalizedName = name.trim().replace(/\s+/g, ' ');
          if (!normalizedName) {
            return;
          }

          const nameLower = normalizedName.toLocaleLowerCase('es-AR');
          const previous = byNameLower.get(nameLower);
          if (previous) {
            byNameLower.set(nameLower, {
              ...previous,
              isDefault: previous.isDefault || isDefault,
            });
            return;
          }

          byNameLower.set(nameLower, {
            name: normalizedName,
            nameLower,
            type,
            isDefault,
            createdAt: now,
            updatedAt: now,
          });
        };

        for (const seed of DEFAULT_CATEGORY_SEED) {
          rememberCategory(seed.name, seed.type, seed.isDefault);
        }

        const movements = await movementsTable.toArray();
        for (const movement of movements) {
          rememberCategory(
            movement.category,
            movement.type === 'ingreso' ? 'ingreso' : 'gasto',
            false,
          );
        }

        await categoriesTable.bulkPut([...byNameLower.values()]);
      });
  }
}

export const db = new GastosDatabase();
