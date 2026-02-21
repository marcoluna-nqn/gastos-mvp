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
  onQuickCreateCategory?: (name: string) => Promise<void>;
}

type FieldName =
  | 'amount'
  | 'category'
  | 'date'
  | 'dueDate'
  | 'paymentMethod'
  | 'quickCategory';
type ErrorState = Partial<Record<FieldName, string>>;

interface FormState {
  type: MovementType;
  amount: string;
  category: string;
  date: string;
  dueDate: string;
  isPaymentReminder: boolean;
  paymentMethod: string;
  note: string;
}

const QUICK_AMOUNTS_ARS = [1000, 5000, 10000] as const;
const quickAmountFormatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

const isIsoDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

const normalizeCategoryName = (value: string): string => value.trim().replace(/\s+/g, ' ');

const hasCategory = (categories: string[], candidate: string): boolean => {
  const normalizedCandidate = normalizeCategoryName(candidate).toLocaleLowerCase('es');
  return categories.some((category) => category.toLocaleLowerCase('es') === normalizedCandidate);
};

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
  dueDate: '',
  isPaymentReminder: false,
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
  onQuickCreateCategory,
}: MovementFormProps) => {
  const [form, setForm] = useState<FormState>(() => getDefaultState(categories, paymentMethods));
  const [errors, setErrors] = useState<ErrorState>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const categoryFieldRef = useRef<HTMLSelectElement>(null);
  const dateFieldRef = useRef<HTMLInputElement>(null);
  const dueDateFieldRef = useRef<HTMLInputElement>(null);
  const reminderFieldRef = useRef<HTMLInputElement>(null);
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
      dueDate: editingMovement.dueDate ?? '',
      isPaymentReminder: Boolean(editingMovement.isPaymentReminder ?? editingMovement.isBill ?? false),
      paymentMethod: editingMovement.paymentMethod,
      note: editingMovement.note ?? '',
    });
    setShowOptionalFields(
      Boolean(
        editingMovement.note ||
          editingMovement.dueDate ||
          editingMovement.isPaymentReminder ||
          editingMovement.isBill,
      ),
    );
    setQuickCategoryName('');
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
    setQuickCategoryName('');
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

    if (!form.date || !isIsoDate(form.date)) {
      nextErrors.date = 'La fecha es obligatoria.';
    }

    if (form.dueDate && !isIsoDate(form.dueDate)) {
      nextErrors.dueDate = 'La fecha de vencimiento no es valida.';
    }

    if (form.isPaymentReminder && !form.dueDate) {
      nextErrors.dueDate = 'Para activar recordatorio agrega vencimiento.';
    }

    if (!form.paymentMethod.trim()) {
      nextErrors.paymentMethod = 'Elegi un metodo de pago.';
    }

    return nextErrors;
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

    if (nextErrors.dueDate) {
      setShowOptionalFields(true);
      requestAnimationFrame(() => {
        focusElement(dueDateFieldRef.current);
      });
      return;
    }

    if (nextErrors.paymentMethod) {
      setShowOptionalFields(true);
      requestAnimationFrame(() => {
        focusElement(paymentFieldRef.current);
      });
      return;
    }

    if (nextErrors.quickCategory) {
      setShowOptionalFields(true);
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
        dueDate: form.dueDate || undefined,
        isBill: form.isPaymentReminder,
        isPaymentReminder: form.isPaymentReminder,
        paymentMethod: form.paymentMethod.trim(),
        note: form.note.trim() || undefined,
      });

      if (!editingMovement) {
        setForm((current) => ({
          ...current,
          amount: '',
          note: '',
          date: todayIsoDate(),
          dueDate: '',
          isPaymentReminder: false,
          category: categoryOptions.includes(current.category) ? current.category : defaultCategory,
          paymentMethod: paymentMethods.includes(current.paymentMethod)
            ? current.paymentMethod
            : defaultPaymentMethod,
        }));
        setShowOptionalFields(false);
      }

      setQuickCategoryName('');
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
    setQuickCategoryName('');
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
          focusElement(dueDateFieldRef.current);
        });
      }
      return next;
    });
  };

  const handleQuickCategoryCreate = async () => {
    if (!onQuickCreateCategory || isCreatingCategory) {
      return;
    }

    const normalizedName = normalizeCategoryName(quickCategoryName);
    if (!normalizedName) {
      setErrors((current) => ({
        ...current,
        quickCategory: 'Escribe un nombre para crear categoria.',
      }));
      return;
    }

    if (hasCategory(categoryOptions, normalizedName)) {
      setField('category', normalizedName);
      setQuickCategoryName('');
      setErrors((current) => ({ ...current, quickCategory: undefined }));
      return;
    }

    setIsCreatingCategory(true);
    try {
      await onQuickCreateCategory(normalizedName);
      setField('category', normalizedName);
      setQuickCategoryName('');
      setErrors((current) => ({ ...current, quickCategory: undefined }));
    } catch (error) {
      setErrors((current) => ({
        ...current,
        quickCategory: error instanceof Error ? error.message : 'No se pudo crear la categoria.',
      }));
    } finally {
      setIsCreatingCategory(false);
    }
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
                  showOptionalFields ? dueDateFieldRef.current : amountInputRef.current,
                )
              }
              aria-invalid={Boolean(errors.date)}
            />
            {errors.date ? <small className="error-text">{errors.date}</small> : null}
          </label>
        </div>

        {onQuickCreateCategory ? (
          <div className="quick-category-row">
            <input
              className={`field ${errors.quickCategory ? 'field-error' : ''}`}
              type="text"
              value={quickCategoryName}
              onChange={(event) => {
                setQuickCategoryName(event.target.value);
                if (errors.quickCategory) {
                  setErrors((current) => ({ ...current, quickCategory: undefined }));
                }
              }}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') {
                  return;
                }
                event.preventDefault();
                void handleQuickCategoryCreate();
              }}
              placeholder="Nueva categoria (ej. Inversion)"
              aria-label="Crear categoria rapida"
            />
            <button
              type="button"
              className="button button-secondary compact"
              disabled={isCreatingCategory}
              onClick={() => {
                void handleQuickCategoryCreate();
              }}
            >
              {isCreatingCategory ? 'Agregando...' : '+ Categoria'}
            </button>
          </div>
        ) : null}
        {errors.quickCategory ? <small className="error-text">{errors.quickCategory}</small> : null}

        <button
          type="button"
          className="text-button optional-toggle"
          onClick={toggleOptionalFields}
          aria-expanded={showOptionalFields}
        >
          {showOptionalFields ? 'Ocultar detalles opcionales' : 'Agregar vencimiento, metodo y nota'}
        </button>

        {showOptionalFields ? (
          <div className="optional-fields">
            <div className="form-grid optional-grid">
              <label className="form-field">
                <span>Vencimiento (opcional)</span>
                <input
                  ref={dueDateFieldRef}
                  className={`field ${errors.dueDate ? 'field-error' : ''}`}
                  type="date"
                  enterKeyHint="next"
                  value={form.dueDate}
                  onChange={(event) => setField('dueDate', event.target.value)}
                  onKeyDown={(event) => handleAdvanceOnEnter(event, reminderFieldRef.current)}
                  aria-invalid={Boolean(errors.dueDate)}
                />
                {errors.dueDate ? <small className="error-text">{errors.dueDate}</small> : null}
              </label>

              <div className="form-field reminder-toggle-field">
                <span>Pago con recordatorio</span>
                <label className="reminder-toggle">
                  <input
                    ref={reminderFieldRef}
                    type="checkbox"
                    checked={form.isPaymentReminder}
                    onChange={(event) => setField('isPaymentReminder', event.target.checked)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        focusElement(paymentFieldRef.current);
                      }
                    }}
                  />
                  <span>Recordarme este pago</span>
                </label>
              </div>
            </div>

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
