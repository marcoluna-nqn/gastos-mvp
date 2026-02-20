import Dexie, { type Table } from 'dexie';
import { DATABASE_NAME } from '../constants/options';
import type { MovementRecord } from '../types/movement';

class GastosDatabase extends Dexie {
  movements!: Table<MovementRecord, number>;

  constructor() {
    super(DATABASE_NAME);

    this.version(1).stores({
      movements: '++id, type, category, date, paymentMethod, amountCents, createdAt',
    });
  }
}

export const db = new GastosDatabase();
