export type CategoryType = 'gasto' | 'ingreso' | 'both';

export interface CategoryRecord {
  id?: number;
  name: string;
  nameLower: string;
  type: CategoryType;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategorySeed {
  name: string;
  type: CategoryType;
  isDefault: boolean;
}
