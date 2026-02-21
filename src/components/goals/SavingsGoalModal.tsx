import { useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import type { SavingsGoalDraft, SavingsGoalRecord } from '../../types/savingsGoal';
import { formatArs } from '../../utils/currency';
import { formatMonthLabel } from '../../utils/date';
import { normalizeAmountInput, parseAmountToCents } from '../../utils/math';

interface SavingsGoalModalProps {
  open: boolean;
  defaultMonthKey: string;
  goals: SavingsGoalRecord[];
  onClose: () => void;
  onSaveGoal: (draft: SavingsGoalDraft) => Promise<unknown>;
  onDeleteGoalByMonth: (monthKey: string) => Promise<void>;
}

const formatGoalInput = (targetCents: number): string => {
  return (targetCents / 100).toFixed(2).replace('.', ',');
};

export const SavingsGoalModal = ({
  open,
  defaultMonthKey,
  goals,
  onClose,
  onSaveGoal,
  onDeleteGoalByMonth,
}: SavingsGoalModalProps) => {
  const { pushToast } = useToast();
  const amountInputRef = useRef<HTMLInputElement>(null);
  const [selectedMonthKey, setSelectedMonthKey] = useState(defaultMonthKey);
  const [draftTarget, setDraftTarget] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const goalsByMonth = useMemo(() => {
    const map = new Map<string, SavingsGoalRecord>();
    for (const goal of goals) {
      map.set(goal.monthKey, goal);
    }
    return map;
  }, [goals]);

  const currentGoal = goalsByMonth.get(selectedMonthKey);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedMonthKey(defaultMonthKey);
    const activeGoal = goalsByMonth.get(defaultMonthKey);
    setDraftTarget(activeGoal ? formatGoalInput(activeGoal.targetCents) : '');
  }, [defaultMonthKey, goalsByMonth, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const activeGoal = goalsByMonth.get(selectedMonthKey);
    setDraftTarget(activeGoal ? formatGoalInput(activeGoal.targetCents) : '');
  }, [goalsByMonth, open, selectedMonthKey]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      amountInputRef.current?.focus();
      amountInputRef.current?.select();
    }, 20);

    return () => window.clearTimeout(timeoutId);
  }, [open]);

  const handleSave = async () => {
    const parsed = parseAmountToCents(draftTarget);
    if (parsed === null || parsed <= 0) {
      pushToast({
        tone: 'error',
        title: 'Objetivo invalido',
        description: 'Ingresa un monto de ahorro mayor a 0.',
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSaveGoal({
        monthKey: selectedMonthKey,
        targetCents: parsed,
      });
      pushToast({
        tone: 'success',
        title: 'Objetivo guardado',
        description: `Se actualizo el objetivo para ${formatMonthLabel(selectedMonthKey)}.`,
      });
    } catch (error) {
      pushToast({
        tone: 'error',
        title: 'No se pudo guardar',
        description: error instanceof Error ? error.message : 'Intenta nuevamente.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!currentGoal) {
      return;
    }

    setIsSaving(true);
    try {
      await onDeleteGoalByMonth(currentGoal.monthKey);
      setDraftTarget('');
      pushToast({
        tone: 'success',
        title: 'Objetivo eliminado',
        description: `El mes ${formatMonthLabel(currentGoal.monthKey)} quedo sin objetivo.`,
      });
    } catch (error) {
      pushToast({
        tone: 'error',
        title: 'No se pudo eliminar',
        description: error instanceof Error ? error.message : 'Intenta nuevamente.',
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
      <section className="dialog-card savings-goal-modal" role="dialog" aria-modal="true" aria-label="Objetivo de ahorro">
        <header className="section-header">
          <h3>Objetivo de ahorro</h3>
          <button type="button" className="button button-secondary compact" onClick={onClose}>
            Cerrar
          </button>
        </header>

        <label className="form-field">
          <span>Mes</span>
          <input
            className="field"
            type="month"
            value={selectedMonthKey}
            onChange={(event) => setSelectedMonthKey(event.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Objetivo mensual (ARS)</span>
          <input
            ref={amountInputRef}
            className="field amount-field"
            type="text"
            inputMode="decimal"
            value={draftTarget}
            placeholder="Ej: 150000"
            onChange={(event) => setDraftTarget(normalizeAmountInput(event.target.value))}
            onFocus={(event) => event.currentTarget.select()}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void handleSave();
              }
            }}
          />
        </label>

        <p className="goal-helper-text">
          {currentGoal
            ? `Objetivo actual: ${formatArs(currentGoal.targetCents)}`
            : 'No hay objetivo para este mes.'}
        </p>

        <div className="dialog-actions">
          {currentGoal ? (
            <button type="button" className="button button-secondary" onClick={() => void handleRemove()} disabled={isSaving}>
              Quitar objetivo
            </button>
          ) : null}
          <button type="button" className="button button-primary" onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar objetivo'}
          </button>
        </div>
      </section>
    </div>
  );
};
