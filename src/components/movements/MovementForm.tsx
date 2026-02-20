import { useEffect, useMemo, useState } from 'react';
import { todayIsoDate } from '../../utils/date';
import { parseAmountToCents } from '../../utils/math';
import type { MovementDraft, MovementRecord, MovementType } from '../../types/movement';

interface MovementFormProps {
  categories: string[];
  paymentMethods: string[];
  editingMovement: MovementRecord | null;
  onSubmit: (draft: MovementDraft) => Promise<void>;
  onCancelEdit: () => void;
}

type FieldName = 'amount' | 'category' | 'date' | 'paymentMethod';
type ErrorState = Partial<Record<FieldName, string>>;

interface FormState {
  type: MovementType;
  amount: string;
  category: string;
  date: string;
  paymentMethod: string;
  note: string;
}

const getDefaultState = (categories: string[], methods: string[]): FormState => ({
  type: 'gasto',
  amount: '',
  category: categories[0] ?? 'Otros',
  date: todayIsoDate(),
  paymentMethod: methods[0] ?? 'Efectivo',
  note: '',
});

export const MovementForm = ({
  categories,
  paymentMethods,
  editingMovement,
  onSubmit,
  onCancelEdit,
}: MovementFormProps) => {
  const defaults = useMemo(() => getDefaultState(categories, paymentMethods), [categories, paymentMethods]);
  const [form, setForm] = useState<FormState>(defaults);
  const [errors, setErrors] = useState<ErrorState>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!editingMovement) {
      setForm(defaults);
      setErrors({});
      return;
    }

    setForm({
      type: editingMovement.type,
      amount: (editingMovement.amountCents / 100).toFixed(2),
      category: editingMovement.category,
      date: editingMovement.date,
      paymentMethod: editingMovement.paymentMethod,
      note: editingMovement.note ?? '',
    });
    setErrors({});
  }, [defaults, editingMovement]);

  const setField = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const validate = (): ErrorState => {
    const nextErrors: ErrorState = {};
    const cents = parseAmountToCents(form.amount);

    if (cents === null || cents <= 0) {
      nextErrors.amount = 'Ingresá un monto válido mayor a 0.';
    }

    if (!form.category.trim()) {
      nextErrors.category = 'La categoría es obligatoria.';
    }

    if (!form.date || !/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
      nextErrors.date = 'La fecha es obligatoria.';
    }

    if (!form.paymentMethod.trim()) {
      nextErrors.paymentMethod = 'Elegí un método de pago.';
    }

    return nextErrors;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const parsedAmount = parseAmountToCents(form.amount);
    if (parsedAmount === null) {
      setErrors((current) => ({ ...current, amount: 'Monto inválido.' }));
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        type: form.type,
        amountCents: parsedAmount,
        category: form.category.trim(),
        date: form.date,
        paymentMethod: form.paymentMethod.trim(),
        note: form.note.trim() || undefined,
      });

      if (!editingMovement) {
        setForm(defaults);
      }
      setErrors({});
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setForm(defaults);
    setErrors({});
    onCancelEdit();
  };

  return (
    <section className="card">
      <header className="section-header">
        <h2>{editingMovement ? 'Editar movimiento' : 'Nuevo movimiento'}</h2>
      </header>

      <form className="movement-form" onSubmit={handleSubmit} noValidate>
        <div className="segmented-control" role="tablist" aria-label="Tipo de movimiento">
          {(['gasto', 'ingreso'] as MovementType[]).map((type) => (
            <button
              key={type}
              type="button"
              className={`segmented-option ${form.type === type ? 'is-active' : ''}`}
              onClick={() => setField('type', type)}
            >
              {type === 'gasto' ? 'Gasto' : 'Ingreso'}
            </button>
          ))}
        </div>

        <label className="form-field">
          <span>Monto</span>
          <input
            className={`field ${errors.amount ? 'field-error' : ''}`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,00"
            value={form.amount}
            onChange={(event) => setField('amount', event.target.value)}
          />
          {errors.amount ? <small className="error-text">{errors.amount}</small> : null}
        </label>

        <div className="form-grid">
          <label className="form-field">
            <span>Categoría</span>
            <select
              className={`field ${errors.category ? 'field-error' : ''}`}
              value={form.category}
              onChange={(event) => setField('category', event.target.value)}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {errors.category ? <small className="error-text">{errors.category}</small> : null}
          </label>

          <label className="form-field">
            <span>Fecha</span>
            <input
              className={`field ${errors.date ? 'field-error' : ''}`}
              type="date"
              value={form.date}
              onChange={(event) => setField('date', event.target.value)}
            />
            {errors.date ? <small className="error-text">{errors.date}</small> : null}
          </label>
        </div>

        <label className="form-field">
          <span>Método de pago</span>
          <select
            className={`field ${errors.paymentMethod ? 'field-error' : ''}`}
            value={form.paymentMethod}
            onChange={(event) => setField('paymentMethod', event.target.value)}
          >
            {paymentMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
          {errors.paymentMethod ? <small className="error-text">{errors.paymentMethod}</small> : null}
        </label>

        <label className="form-field">
          <span>Nota (opcional)</span>
          <textarea
            className="field"
            rows={3}
            maxLength={200}
            value={form.note}
            onChange={(event) => setField('note', event.target.value)}
            placeholder="Detalle breve"
          />
        </label>

        <div className="actions-row">
          {editingMovement ? (
            <button type="button" className="button button-secondary" onClick={handleCancelEdit}>
              Cancelar edición
            </button>
          ) : null}
          <button type="submit" className="button button-primary" disabled={isSubmitting}>
            {isSubmitting
              ? 'Guardando...'
              : editingMovement
                ? 'Guardar cambios'
                : form.type === 'gasto'
                  ? 'Cargar gasto'
                  : 'Cargar ingreso'}
          </button>
        </div>
      </form>
    </section>
  );
};
