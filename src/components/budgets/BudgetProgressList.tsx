import type { CategoryBudgetProgress } from '../../utils/budgetCalculations';
import { formatArs } from '../../utils/currency';

interface BudgetProgressListProps {
  items: CategoryBudgetProgress[];
  editingCategoryId: number | null;
  draftAmount: string;
  isSaving: boolean;
  onStartEdit: (categoryId: number, currentBudgetCents: number) => void;
  onDraftAmountChange: (value: string) => void;
  onCancelEdit: () => void;
  onSave: (entry: CategoryBudgetProgress) => Promise<void>;
  onDeleteBudget: (entry: CategoryBudgetProgress) => Promise<void>;
}

const STATUS_LABELS: Record<CategoryBudgetProgress['status'], string> = {
  ok: 'OK',
  warning: 'Atencion',
  exceeded: 'Excedido',
  none: 'Sin presupuesto',
};

const clampPercent = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.min(100, Math.round(value));
};

export const BudgetProgressList = ({
  items,
  editingCategoryId,
  draftAmount,
  isSaving,
  onStartEdit,
  onDraftAmountChange,
  onCancelEdit,
  onSave,
  onDeleteBudget,
}: BudgetProgressListProps) => {
  return (
    <ul className="budget-list">
      {items.map((entry) => {
        const usedPercentClamped = clampPercent(entry.usedPercent);
        const isEditing = editingCategoryId === entry.categoryId;
        return (
          <li key={entry.categoryId} className="budget-item">
            <div className="budget-item-header">
              <div>
                <p className="budget-category-name">{entry.categoryName}</p>
                <span className={`budget-status budget-status-${entry.status}`}>{STATUS_LABELS[entry.status]}</span>
              </div>
              <div className="budget-values">
                <strong>{formatArs(entry.spentCents)}</strong>
                <span>/ {entry.budgetCents > 0 ? formatArs(entry.budgetCents) : 'Sin tope'}</span>
              </div>
            </div>

            <div className="budget-progress-track">
              <span className={`budget-progress-fill budget-status-${entry.status}`} style={{ width: `${usedPercentClamped}%` }} />
            </div>

            <div className="budget-item-meta">
              <span>{entry.budgetCents > 0 ? `${Math.round(entry.usedPercent)}% usado` : 'Configura un tope'}</span>
              <span>{entry.budgetCents > 0 ? `Saldo: ${formatArs(entry.remainingCents)}` : ''}</span>
            </div>

            {isEditing ? (
              <div className="budget-edit-row">
                <input
                  className="field"
                  type="text"
                  inputMode="decimal"
                  value={draftAmount}
                  placeholder="0,00"
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) => onDraftAmountChange(event.target.value)}
                />
                <button type="button" className="button button-primary compact" onClick={() => void onSave(entry)} disabled={isSaving}>
                  Guardar
                </button>
                <button type="button" className="button button-secondary compact" onClick={onCancelEdit}>
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="actions-row compact">
                <button
                  type="button"
                  className="button button-secondary compact"
                  onClick={() => onStartEdit(entry.categoryId, entry.budgetCents)}
                >
                  {entry.budgetCents > 0 ? 'Editar' : 'Definir'}
                </button>
                {entry.budgetId ? (
                  <button
                    type="button"
                    className="button button-danger ghost compact"
                    onClick={() => void onDeleteBudget(entry)}
                    disabled={isSaving}
                  >
                    Quitar
                  </button>
                ) : null}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};
