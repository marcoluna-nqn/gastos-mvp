import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  createMovement,
  deleteMovement,
  getAllMovements,
  importMovements,
  updateMovement,
} from '../services/movementService';
import type { MovementDraft } from '../types/movement';

export const useMovements = () => {
  const movements = useLiveQuery(() => getAllMovements(), []);

  const create = useCallback((draft: MovementDraft) => createMovement(draft), []);
  const update = useCallback((id: number, draft: MovementDraft) => updateMovement(id, draft), []);
  const remove = useCallback((id: number) => deleteMovement(id), []);
  const importMany = useCallback(
    (drafts: MovementDraft[], strategy: 'merge' | 'replace') => importMovements(drafts, strategy),
    [],
  );

  return {
    loading: movements === undefined,
    movements: movements ?? [],
    createMovement: create,
    updateMovement: update,
    deleteMovement: remove,
    importMovements: importMany,
  };
};
