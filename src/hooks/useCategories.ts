import { useCallback, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { CategoryType } from '../types/category';
import {
  createCategory,
  deleteCategoryAndReassign,
  ensureDefaultCategories,
  getAllCategories,
  updateCategory,
} from '../services/categoryService';

export const useCategories = () => {
  const categories = useLiveQuery(() => getAllCategories(), []);

  useEffect(() => {
    void ensureDefaultCategories();
  }, []);

  const create = useCallback((name: string, type: CategoryType) => createCategory(name, type), []);
  const update = useCallback((id: number, name: string, type: CategoryType) => updateCategory(id, { name, type }), []);
  const remove = useCallback((id: number) => deleteCategoryAndReassign(id), []);

  return {
    loading: categories === undefined,
    categories: categories ?? [],
    createCategory: create,
    updateCategory: update,
    deleteCategory: remove,
  };
};
