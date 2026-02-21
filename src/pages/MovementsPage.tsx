import { BudgetManager } from '../components/budgets/BudgetManager';
import { useEffect, useMemo, useState } from 'react';
import { CategoryManager } from '../components/categories/CategoryManager';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { MovementForm } from '../components/movements/MovementForm';
import { MovementHistory } from '../components/movements/MovementHistory';
import { SpreadsheetTable } from '../components/spreadsheet/SpreadsheetTable';
import { useToast } from '../hooks/useToast';
import type { BudgetRecord } from '../types/budget';
import type { CategoryRecord, CategoryType } from '../types/category';
import type { MovementDraft, MovementRecord } from '../types/movement';
import { todayIsoDate } from '../utils/date';
import { applySearchFilter } from '../utils/filters';

interface MovementsPageProps {
  movements: MovementRecord[];
  categories: string[];
  categoryRecords: CategoryRecord[];
  budgets: BudgetRecord[];
  paymentMethods: string[];
  filterMonthKey: string;
  onCreateMovement: (draft: MovementDraft) => Promise<number>;
  onUpdateMovement: (id: number, draft: MovementDraft) => Promise<void>;
  onDeleteMovement: (id: number) => Promise<void>;
  onCreateCategory: (name: string, type: CategoryType) => Promise<unknown>;
  onUpdateCategory: (id: number, name: string, type: CategoryType) => Promise<void>;
  onDeleteCategory: (id: number) => Promise<void>;
  onSaveBudget: (payload: { categoryId: number; monthKey: string; amountCents: number }) => Promise<unknown>;
  onDeleteBudget: (budgetId: number) => Promise<void>;
  onCopyBudgetsToMonth: (sourceMonthKey: string, targetMonthKey: string) => Promise<number>;
}

const cloneMovementToDraft = (movement: MovementRecord): MovementDraft => ({
  type: movement.type,
  amountCents: movement.amountCents,
  category: movement.category,
  date: todayIsoDate(),
  dueDate: movement.dueDate,
  isBill: movement.isBill ?? movement.isPaymentReminder,
  isPaymentReminder: movement.isPaymentReminder ?? movement.isBill,
  paymentMethod: movement.paymentMethod,
  note: movement.note,
});

export const MovementsPage = ({
  movements,
  categories,
  categoryRecords,
  budgets,
  paymentMethods,
  filterMonthKey,
  onCreateMovement,
  onUpdateMovement,
  onDeleteMovement,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onSaveBudget,
  onDeleteBudget,
  onCopyBudgetsToMonth,
}: MovementsPageProps) => {
  const { pushToast } = useToast();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'sheet'>('list');
  const [editingMovement, setEditingMovement] = useState<MovementRecord | null>(null);
  const [movementToDelete, setMovementToDelete] = useState<MovementRecord | null>(null);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [budgetManagerOpen, setBudgetManagerOpen] = useState(false);
  const [onlyDuePayments, setOnlyDuePayments] = useState(false);

  const visibleMovements = useMemo(() => {
    const searched = applySearchFilter(movements, search);
    if (!onlyDuePayments) {
      return searched;
    }

    return searched.filter(
      (movement) => Boolean(movement.dueDate),
    );
  }, [movements, onlyDuePayments, search]);

  useEffect(() => {
    if (viewMode === 'sheet') {
      setEditingMovement(null);
    }
  }, [viewMode]);

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
        description: 'El registro se agrego al historial.',
      });
    } catch (error) {
      pushToast({
        tone: 'error',
        title: 'No se pudo guardar',
        description: error instanceof Error ? error.message : 'Intenta de nuevo.',
      });
      throw error;
    }
  };

  const handleDuplicateMovement = async (movement: MovementRecord): Promise<number | null> => {
    try {
      const newId = await onCreateMovement(cloneMovementToDraft(movement));
      pushToast({
        tone: 'success',
        title: 'Movimiento duplicado',
        description: 'Se creo una copia con fecha de hoy.',
      });
      return newId;
    } catch (error) {
      pushToast({
        tone: 'error',
        title: 'No se pudo duplicar',
        description: error instanceof Error ? error.message : 'Intenta de nuevo.',
      });
      return null;
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
        description: 'Se elimino del historial.',
      });
    } catch (error) {
      pushToast({
        tone: 'error',
        title: 'No se pudo eliminar',
        description: error instanceof Error ? error.message : 'Intenta de nuevo.',
      });
    } finally {
      setMovementToDelete(null);
      if (editingMovement?.id === movementToDelete.id) {
        setEditingMovement(null);
      }
    }
  };

  const handleCreateCategory = async (name: string, type: CategoryType) => {
    await onCreateCategory(name, type);
    pushToast({
      tone: 'success',
      title: 'Categoria creada',
      description: 'Ya esta disponible en formularios y planilla.',
    });
  };

  const handleUpdateCategory = async (id: number, name: string, type: CategoryType) => {
    await onUpdateCategory(id, name, type);
    pushToast({
      tone: 'success',
      title: 'Categoria actualizada',
      description: 'Se aplicaron los cambios.',
    });
  };

  const handleDeleteCategory = async (id: number) => {
    await onDeleteCategory(id);
    pushToast({
      tone: 'success',
      title: 'Categoria eliminada',
      description: 'Los movimientos asociados se reasignaron a "Otros".',
    });
  };

  return (
    <div className="two-columns">
      <MovementForm
        categories={categories}
        paymentMethods={paymentMethods}
        editingMovement={editingMovement}
        onSubmit={handleSubmit}
        onCancelEdit={() => setEditingMovement(null)}
        onQuickCreateCategory={async (name) => {
          await handleCreateCategory(name, 'both');
        }}
      />

      <div className="movements-panel">
        <section className="card view-mode-card">
          <div className="section-header">
            <h2>Movimientos</h2>
            <div className="view-mode-actions">
              <button
                type="button"
                className="button button-secondary compact"
                onClick={() => setCategoryManagerOpen(true)}
              >
                Categorias
              </button>
              <button
                type="button"
                className="button button-secondary compact"
                onClick={() => setBudgetManagerOpen(true)}
              >
                Presupuestos
              </button>
              <button
                type="button"
                className={`button compact ${onlyDuePayments ? 'button-primary' : 'button-secondary'}`}
                onClick={() => setOnlyDuePayments((current) => !current)}
                aria-pressed={onlyDuePayments}
              >
                {onlyDuePayments ? 'Mostrando vencimientos' : 'Solo pagos/vencimientos'}
              </button>
              <div className="segmented-control view-mode-control" role="tablist" aria-label="Cambiar vista">
                <button
                  type="button"
                  className={`segmented-option ${viewMode === 'list' ? 'is-active' : ''}`}
                  onClick={() => setViewMode('list')}
                >
                  Lista
                </button>
                <button
                  type="button"
                  className={`segmented-option ${viewMode === 'sheet' ? 'is-active' : ''}`}
                  onClick={() => setViewMode('sheet')}
                >
                  Planilla
                </button>
              </div>
            </div>
          </div>
        </section>

        {viewMode === 'list' ? (
          <MovementHistory
            movements={visibleMovements}
            search={search}
            onSearchChange={setSearch}
            onEdit={setEditingMovement}
            onDeleteRequest={setMovementToDelete}
            onDuplicate={handleDuplicateMovement}
          />
        ) : (
          <SpreadsheetTable
            movements={visibleMovements}
            search={search}
            categories={categories}
            paymentMethods={paymentMethods}
            onSearchChange={setSearch}
            onCreateMovement={onCreateMovement}
            onUpdateMovement={onUpdateMovement}
            onDeleteRequest={setMovementToDelete}
            onDuplicateMovement={handleDuplicateMovement}
          />
        )}
      </div>

      <ConfirmDialog
        open={movementToDelete !== null}
        title="Eliminar movimiento"
        description="Esta accion no se puede deshacer. ¿Quieres eliminar el movimiento?"
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setMovementToDelete(null)}
      />

      <CategoryManager
        open={categoryManagerOpen}
        categories={categoryRecords}
        onClose={() => setCategoryManagerOpen(false)}
        onCreateCategory={handleCreateCategory}
        onUpdateCategory={handleUpdateCategory}
        onDeleteCategory={handleDeleteCategory}
      />

      <BudgetManager
        open={budgetManagerOpen}
        categories={categoryRecords}
        budgets={budgets}
        movements={movements}
        monthFilterKey={filterMonthKey}
        onClose={() => setBudgetManagerOpen(false)}
        onSaveBudget={onSaveBudget}
        onDeleteBudget={onDeleteBudget}
        onCopyBudgetsToMonth={onCopyBudgetsToMonth}
      />
    </div>
  );
};
