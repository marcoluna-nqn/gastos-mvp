import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { formatAmountFromCents } from '../../utils/currency';
import { todayIsoDate } from '../../utils/date';
import { normalizeAmountInput, parseAmountToCents } from '../../utils/math';
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

const QUICK_AMOUNTS_ARS = [1000, 5000, 10000] as const;
const quickAmountFormatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

const getDefaultCategory = (categories: string[]): string => categories[0] ?? 'Otros';
const getDefaultPaymentMethod = (methods: string[]): string => methods[0] ?? 'Efectivo';

const getDefaultState = (
  categories: string[],
  methods: string[],
  type: MovementType = 'gasto',
): FormState => ({
  type,
  amount: '',
  category: getDefaultCategory(categories),
  date: todayIsoDate(),
  paymentMethod: getDefaultPaymentMethod(methods),
  note: '',
});

const focusAmountInput = (input: HTMLInputElement | null, shouldSelect = true): void => {
  if (!input) {
    return;
  }

  input.focus({ preventScroll: true });
  if (shouldSelect) {
    input.select();
  }
};

export const MovementForm = ({
  categories,
  paymentMethods,
  editingMovement,
  onSubmit,
  onCancelEdit,
}: MovementFormProps) => {
  const [form, setForm] = useState<FormState>(() => getDefaultState(categories, paymentMethods));
  const [errors, setErrors] = useState<ErrorState>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const categoryFieldRef = useRef<HTMLSelectElement>(null);
  const dateFieldRef = useRef<HTMLInputElement>(null);
  const paymentFieldRef = useRef<HTMLSelectElement>(null);
  const noteFieldRef = useRef<HTMLTextAreaElement>(null);
  const previousEditingIdRef = useRef<number | null>(null);
  const defaultCategory = useMemo(() => getDefaultCategory(categories), [categories]);
  const defaultPaymentMethod = useMemo(
    () => getDefaultPaymentMethod(paymentMethods),
    [paymentMethods],
  );
  const categoryOptions = useMemo(
    () => (categories.length > 0 ? categories : [defaultCategory]),
    [categories, defaultCategory],
  );

  useEffect(() => {
    focusAmountInput(amountInputRef.current, false);
  }, []);

  useEffect(() => {
    if (!editingMovement) {
      return;
    }

    previousEditingIdRef.current = editingMovement.id ?? null;
    setForm({
      type: editingMovement.type,
      amount: formatAmountFromCents(editingMovement.amountCents, { currency: false }),
      category: editingMovement.category,
      date: editingMovement.date,
      paymentMethod: editingMovement.paymentMethod,
      note: editingMovement.note ?? '',
    });
    setShowOptionalFields(true);
    setErrors({});

    requestAnimationFrame(() => {
      focusAmountInput(amountInputRef.current, true);
    });
  }, [editingMovement]);

  useEffect(() => {
    if (editingMovement) {
      return;
    }

    if (previousEditingIdRef.current === null) {
      return;
    }

    previousEditingIdRef.current = null;
    setForm((current) => ({
      ...getDefaultState(categories, paymentMethods, current.type),
      category: categoryOptions.includes(current.category) ? current.category : defaultCategory,
      paymentMethod: paymentMethods.includes(current.paymentMethod)
        ? current.paymentMethod
        : defaultPaymentMethod,
    }));
    setErrors({});
    setShowOptionalFields(false);

    requestAnimationFrame(() => {
      focusAmountInput(amountInputRef.current, true);
    });
  }, [
    categories,
    categoryOptions,
    defaultCategory,
    defaultPaymentMethod,
    editingMovement,
    paymentMethods,
  ]);

  useEffect(() => {
    setForm((current) => {
      const nextCategory = categories.includes(current.category) ? current.category : defaultCategory;
      const nextPaymentMethod = paymentMethods.includes(current.paymentMethod)
        ? current.paymentMethod
        : defaultPaymentMethod;

      if (nextCategory === current.category && nextPaymentMethod === current.paymentMethod) {
        return current;
      }

      return {
        ...current,
        category: nextCategory,
        paymentMethod: nextPaymentMethod,
      };
    });
  }, [categories, defaultCategory, defaultPaymentMethod, paymentMethods]);

  const setField = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const validate = (): ErrorState => {
    const nextErrors: ErrorState = {};
    const cents = parseAmountToCents(form.amount);

    if (cents === null || cents <= 0) {
      nextErrors.amount = 'Ingresa un monto valido mayor a 0.';
    }

    if (!form.category.trim()) {
      nextErrors.category = 'La categoria es obligatoria.';
    }

    if (!form.date || !/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
      nextErrors.date = 'La fecha es obligatoria.';
    }

    if (!form.paymentMethod.trim()) {
      nextErrors.paymentMethod = 'Elegi un metodo de pago.';
    }

    return nextErrors;
  };

  const focusFirstInvalidField = (nextErrors: ErrorState) => {
    if (nextErrors.amount) {
      focusAmountInput(amountInputRef.current, true);
      return;
    }

    if (nextErrors.category) {
      focusElement(categoryFieldRef.current);
      return;
    }

    if (nextErrors.date) {
      focusElement(dateFieldRef.current);
      return;
    }

    if (nextErrors.paymentMethod) {
      setShowOptionalFields(true);
      requestAnimationFrame(() => {
        focusElement(paymentFieldRef.current);
      });
    }
  };

  const clearAmountError = () => {
    if (errors.amount) {
      setErrors((current) => ({ ...current, amount: undefined }));
    }
  };

  const handleAmountChange = (event: ChangeEvent<HTMLInputElement>) => {
    setField('amount', normalizeAmountInput(event.target.value));
    clearAmountError();
  };

  const handleAmountBlur = () => {
    const parsed = parseAmountToCents(form.amount);
    if (parsed !== null) {
      setField('amount', formatAmountFromCents(parsed, { currency: false }));
    }
  };

  const focusElement = (element: HTMLElement | null) => {
    if (!element) {
      return;
    }

    element.focus({ preventScroll: true });
    if (element instanceof HTMLInputElement && element.type === 'text') {
      element.select();
    }
  };

  const handleAdvanceOnEnter = (event: KeyboardEvent<HTMLElement>, nextField: HTMLElement | null) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    if (event.currentTarget instanceof HTMLTextAreaElement) {
      return;
    }

    event.preventDefault();
    focusElement(nextField);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      focusFirstInvalidField(nextErrors);
      return;
    }

    const parsedAmount = parseAmountToCents(form.amount);
    if (parsedAmount === null) {
      setErrors((current) => ({ ...current, amount: 'Monto invalido.' }));
      focusAmountInput(amountInputRef.current, true);
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
        setForm((current) => ({
          ...current,
          amount: '',
          note: '',
          date: todayIsoDate(),
          category: categoryOptions.includes(current.category) ? current.category : defaultCategory,
          paymentMethod: paymentMethods.includes(current.paymentMethod)
            ? current.paymentMethod
            : defaultPaymentMethod,
        }));
        setShowOptionalFields(false);
      }

      setErrors({});
      requestAnimationFrame(() => {
        focusAmountInput(amountInputRef.current, true);
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAmount = (amountArs: number) => {
    const currentCents = parseAmountToCents(form.amount) ?? 0;
    const nextCents = currentCents + amountArs * 100;
    setField('amount', formatAmountFromCents(nextCents, { currency: false }));
    clearAmountError();
    focusAmountInput(amountInputRef.current, true);
  };

  const handleCancelEdit = () => {
    previousEditingIdRef.current = null;
    setForm((current) => getDefaultState(categories, paymentMethods, current.type));
    setErrors({});
    setShowOptionalFields(false);
    onCancelEdit();
    requestAnimationFrame(() => {
      focusAmountInput(amountInputRef.current, true);
    });
  };

  const toggleOptionalFields = () => {
    setShowOptionalFields((current) => {
      const next = !current;
      if (next) {
        requestAnimationFrame(() => {
          focusElement(paymentFieldRef.current);
        });
      }
      return next;
    });
  };

  return (
    <section className="card">
      <header className="section-header">
        <h2>{editingMovement ? 'Editar movimiento' : 'Nuevo movimiento'}</h2>
      </header>

      <form className="movement-form" onSubmit={handleSubmit} noValidate>
        <div className="segmented-control movement-type-control" role="tablist" aria-label="Tipo de movimiento">
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
          <span>Monto (ARS)</span>
          <input
            ref={amountInputRef}
            className={`field amount-field ${errors.amount ? 'field-error' : ''}`}
            type="text"
            inputMode="decimal"
            pattern="[0-9.,]*"
            enterKeyHint="next"
            autoComplete="off"
            placeholder="0,00"
            value={form.amount}
            onChange={handleAmountChange}
            onBlur={handleAmountBlur}
            onFocus={(event) => event.currentTarget.select()}
            onKeyDown={(event) => handleAdvanceOnEnter(event, categoryFieldRef.current)}
            aria-invalid={Boolean(errors.amount)}
          />
          {errors.amount ? <small className="error-text">{errors.amount}</small> : null}
        </label>

        <div className="amount-quick-actions" role="group" aria-label="Montos rapidos">
          {QUICK_AMOUNTS_ARS.map((amount) => (
            <button key={amount} type="button" className="chip-button" onClick={() => handleQuickAmount(amount)}>
              +{quickAmountFormatter.format(amount)}
            </button>
          ))}
        </div>

        <div className="form-grid">
          <label className="form-field">
            <span>Categoria</span>
            <select
              ref={categoryFieldRef}
              className={`field ${errors.category ? 'field-error' : ''}`}
              value={form.category}
              onChange={(event) => setField('category', event.target.value)}
              onKeyDown={(event) => handleAdvanceOnEnter(event, dateFieldRef.current)}
              aria-invalid={Boolean(errors.category)}
            >
              {categoryOptions.map((category) => (
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
              ref={dateFieldRef}
              className={`field ${errors.date ? 'field-error' : ''}`}
              type="date"
              enterKeyHint="next"
              value={form.date}
              onChange={(event) => setField('date', event.target.value)}
              onKeyDown={(event) =>
                handleAdvanceOnEnter(
                  event,
                  showOptionalFields ? paymentFieldRef.current : amountInputRef.current,
                )
              }
              aria-invalid={Boolean(errors.date)}
            />
            {errors.date ? <small className="error-text">{errors.date}</small> : null}
          </label>
        </div>

        <button
          type="button"
          className="text-button optional-toggle"
          onClick={toggleOptionalFields}
          aria-expanded={showOptionalFields}
        >
          {showOptionalFields ? 'Ocultar detalles opcionales' : 'Agregar metodo de pago y nota'}
        </button>

        {showOptionalFields ? (
          <div className="optional-fields">
            <label className="form-field">
              <span>Metodo de pago</span>
              <select
                ref={paymentFieldRef}
                className={`field ${errors.paymentMethod ? 'field-error' : ''}`}
                value={form.paymentMethod}
                onChange={(event) => setField('paymentMethod', event.target.value)}
                onKeyDown={(event) => handleAdvanceOnEnter(event, noteFieldRef.current)}
                aria-invalid={Boolean(errors.paymentMethod)}
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
                ref={noteFieldRef}
                className="field"
                rows={3}
                maxLength={200}
                enterKeyHint="done"
                value={form.note}
                onChange={(event) => setField('note', event.target.value)}
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="Detalle breve"
              />
            </label>
          </div>
        ) : null}

        <div className="actions-row">
          {editingMovement ? (
            <button type="button" className="button button-secondary" onClick={handleCancelEdit}>
              Cancelar edicion
            </button>
          ) : null}
          <button type="submit" className="button button-primary" disabled={isSubmitting}>
            {isSubmitting
              ? 'Guardando...'
              : editingMovement
                ? 'Guardar cambios'
                : form.type === 'gasto'
                  ? 'Guardar gasto'
                  : 'Guardar ingreso'}
          </button>
        </div>
      </form>
    </section>
  );
};
