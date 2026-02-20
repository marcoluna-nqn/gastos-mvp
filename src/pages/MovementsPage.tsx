import { useMemo, useState } from 'react';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { MovementForm } from '../components/movements/MovementForm';
import { MovementHistory } from '../components/movements/MovementHistory';
import { useToast } from '../hooks/useToast';
import type { MovementDraft, MovementRecord } from '../types/movement';
import { applySearchFilter } from '../utils/filters';

interface MovementsPageProps {
  movements: MovementRecord[];
  categories: string[];
  paymentMethods: string[];
  onCreateMovement: (draft: MovementDraft) => Promise<unknown>;
  onUpdateMovement: (id: number, draft: MovementDraft) => Promise<void>;
  onDeleteMovement: (id: number) => Promise<void>;
}

export const MovementsPage = ({
  movements,
  categories,
  paymentMethods,
  onCreateMovement,
  onUpdateMovement,
  onDeleteMovement,
}: MovementsPageProps) => {
  const { pushToast } = useToast();
  const [search, setSearch] = useState('');
  const [editingMovement, setEditingMovement] = useState<MovementRecord | null>(null);
  const [movementToDelete, setMovementToDelete] = useState<MovementRecord | null>(null);

  const visibleMovements = useMemo(() => applySearchFilter(movements, search), [movements, search]);

  const handleSubmit = async (draft: MovementDraft) => {
    try {
      if (editingMovement?.id !== undefined) {
        await onUpdateMovement(editingMovement.id, draft);
        setEditingMovement(null);
        pushToast({
          tone: 'success',
          title: 'Movimiento actualizado',
          description: 'Los cambios se guardaron correctamente.',
        });
        return;
      }

      await onCreateMovement(draft);
      pushToast({
        tone: 'success',
        title: 'Movimiento guardado',
        description: 'El registro se agregó al historial.',
      });
    } catch (error) {
      pushToast({
        tone: 'error',
        title: 'No se pudo guardar',
        description: error instanceof Error ? error.message : 'Intentá de nuevo.',
      });
      throw error;
    }
  };

  const handleDelete = async () => {
    if (movementToDelete?.id === undefined) {
      return;
    }

    try {
      await onDeleteMovement(movementToDelete.id);
      pushToast({
        tone: 'success',
        title: 'Movimiento eliminado',
        description: 'Se eliminó del historial.',
      });
    } catch (error) {
      pushToast({
        tone: 'error',
        title: 'No se pudo eliminar',
        description: error instanceof Error ? error.message : 'Intentá de nuevo.',
      });
    } finally {
      setMovementToDelete(null);
      if (editingMovement?.id === movementToDelete.id) {
        setEditingMovement(null);
      }
    }
  };

  return (
    <div className="two-columns">
      <MovementForm
        categories={categories}
        paymentMethods={paymentMethods}
        editingMovement={editingMovement}
        onSubmit={handleSubmit}
        onCancelEdit={() => setEditingMovement(null)}
      />

      <MovementHistory
        movements={visibleMovements}
        search={search}
        onSearchChange={setSearch}
        onEdit={setEditingMovement}
        onDeleteRequest={setMovementToDelete}
      />

      <ConfirmDialog
        open={movementToDelete !== null}
        title="Eliminar movimiento"
        description="Esta acción no se puede deshacer. ¿Querés eliminar el movimiento?"
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setMovementToDelete(null)}
      />
    </div>
  );
};
