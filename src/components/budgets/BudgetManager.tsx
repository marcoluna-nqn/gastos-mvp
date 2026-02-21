import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import type { BudgetRecord } from '../../types/budget';
import type { CategoryRecord } from '../../types/category';
import type { MovementRecord } from '../../types/movement';
import { buildCategoryBudgetProgress, buildBudgetSummarySnapshot } from '../../utils/budgetCalculations';
import { formatArs } from '../../utils/currency';
import { currentMonthKey, formatMonthLabel, nextMonthKey } from '../../utils/date';
import { normalizeAmountInput, parseAmountToCents } from '../../utils/math';
import { BudgetProgressList } from './BudgetProgressList';

interface BudgetManagerProps {
  open: boolean;
  categories: CategoryRecord[];
  budgets: BudgetRecord[];
  movements: MovementRecord[];
  monthFilterKey: string;
  onClose: () => void;
  onSaveBudget: (payload: { categoryId: number; monthKey: string; amountCents: number }) => Promise<unknown>;
  onDeleteBudget: (budgetId: number) => Promise<void>;
  onCopyBudgetsToMonth: (sourceMonthKey: string, targetMonthKey: string) => Promise<number>;
}

export const BudgetManager = ({
  open,
  categories,
  budgets,
  movements,
  monthFilterKey,
  onClose,
  onSaveBudget,
  onDeleteBudget,
  onCopyBudgetsToMonth,
}: BudgetManagerProps) => {
  const { pushToast } = useToast();
  const [selectedMonthKey, setSelectedMonthKey] = useState(currentMonthKey());
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [draftAmount, setDraftAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (monthFilterKey !== 'all') {
      setSelectedMonthKey(monthFilterKey);
      return;
    }

    setSelectedMonthKey(currentMonthKey());
  }, [monthFilterKey, open]);

  const progressItems = useMemo(
    () => buildCategoryBudgetProgress(categories, budgets, movements, selectedMonthKey),
    [budgets, categories, movements, selectedMonthKey],
  );

  const summary = useMemo(
    () => buildBudgetSummarySnapshot(progressItems, selectedMonthKey),
    [progressItems, selectedMonthKey],
  );

  const handleStartEdit = (categoryId: number, currentBudgetCents: number) => {
    setEditingCategoryId(categoryId);
    setDraftAmount(currentBudgetCents > 0 ? (currentBudgetCents / 100).toFixed(2).replace('.', ',') : '');
  };

  const handleSave = async () => {
    if (editingCategoryId === null) {
      return;
    }

    const parsedAmount = parseAmountToCents(draftAmount);
    if (parsedAmount === null || parsedAmount <= 0) {
      pushToast({
        tone: 'error',
        title: 'Monto invalido',
        description: 'Ingresa un presupuesto mayor a 0.',
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSaveBudget({
        categoryId: editingCategoryId,
        monthKey: selectedMonthKey,
        amountCents: parsedAmount,
      });
      pushToast({
        tone: 'success',
        title: 'Presupuesto guardado',
        description: 'El limite mensual se actualizo correctamente.',
      });
      setEditingCategoryId(null);
      setDraftAmount('');
    } catch (error) {
      pushToast({
        tone: 'error',
        title: 'No se pudo guardar',
        description: error instanceof Error ? error.message : 'Intenta de nuevo.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBudget = async (entry: { budgetId?: number }) => {
    if (!entry.budgetId) {
      return;
    }

    setIsSaving(true);
    try {
      await onDeleteBudget(entry.budgetId);
      pushToast({
        tone: 'success',
        title: 'Presupuesto eliminado',
        description: 'La categoria quedo sin limite para este mes.',
      });
    } catch (error) {
      pushToast({
        tone: 'error',
        title: 'No se pudo eliminar',
        description: error instanceof Error ? error.message : 'Intenta de nuevo.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyToNextMonth = async () => {
    const targetMonth = nextMonthKey(selectedMonthKey);
    setIsSaving(true);
    try {
      const copied = await onCopyBudgetsToMonth(selectedMonthKey, targetMonth);
      pushToast({
        tone: copied > 0 ? 'success' : 'info',
        title: copied > 0 ? 'Presupuestos copiados' : 'Sin presupuestos para copiar',
        description:
          copied > 0
            ? `Se copiaron ${copied} categoria(s) hacia ${formatMonthLabel(targetMonth)}.`
            : `No habia presupuestos en ${formatMonthLabel(selectedMonthKey)}.`,
      });
    } catch (error) {
      pushToast({
        tone: 'error',
        title: 'No se pudo copiar',
        description: error instanceof Error ? error.message : 'Intenta de nuevo.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="dialog-card budget-manager" role="dialog" aria-modal="true" aria-label="Presupuestos mensuales">
        <header className="section-header">
          <h3>Presupuestos</h3>
          <button type="button" className="button button-secondary compact" onClick={onClose}>
            Cerrar
          </button>
        </header>

        <div className="budget-controls">
          <label className="form-field">
            <span>Mes</span>
            <input
              className="field"
              type="month"
              value={selectedMonthKey}
              onChange={(event) => setSelectedMonthKey(event.target.value)}
            />
          </label>
          <button type="button" className="button button-secondary compact" onClick={handleCopyToNextMonth} disabled={isSaving}>
            Copiar al mes siguiente
          </button>
        </div>

        <div className="budget-overview">
          <p>
            Presupuestado: <strong>{formatArs(summary.totalBudgetCents)}</strong>
          </p>
          <p>
            Gastado: <strong>{formatArs(summary.totalSpentCents)}</strong>
          </p>
          <p>
            Excedidas: <strong>{summary.exceededCount}</strong> · Alerta: <strong>{summary.warningCount}</strong>
          </p>
        </div>

        <BudgetProgressList
          items={progressItems}
          editingCategoryId={editingCategoryId}
          draftAmount={draftAmount}
          isSaving={isSaving}
          onStartEdit={handleStartEdit}
          onDraftAmountChange={(value) => setDraftAmount(normalizeAmountInput(value))}
          onCancelEdit={() => {
            setEditingCategoryId(null);
            setDraftAmount('');
          }}
          onSave={async () => {
            await handleSave();
          }}
          onDeleteBudget={async (entry) => {
            await handleDeleteBudget(entry);
          }}
        />
      </section>
    </div>
  );
};
