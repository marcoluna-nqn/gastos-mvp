import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { useSpreadsheetNavigation } from '../../hooks/useSpreadsheetNavigation';
import type { MovementDraft, MovementRecord, MovementType } from '../../types/movement';
import { formatAmountFromCents, formatArs } from '../../utils/currency';
import { formatDisplayDate, todayIsoDate } from '../../utils/date';
import { normalizeAmountInput, parseAmountToCents } from '../../utils/math';
import { EmptyState } from '../common/EmptyState';
import { SpreadsheetRow } from './SpreadsheetRow';
import type {
  SpreadsheetCellPosition,
  SpreadsheetColumnKey,
  SpreadsheetDraftRow,
  SpreadsheetNavigationIntent,
  SpreadsheetRenderableRow,
} from './types';

interface SpreadsheetTableProps {
  movements: MovementRecord[];
  search: string;
  categories: string[];
  paymentMethods: string[];
  onSearchChange: (value: string) => void;
  onCreateMovement: (draft: MovementDraft) => Promise<unknown>;
  onUpdateMovement: (id: number, draft: MovementDraft) => Promise<void>;
  onDeleteRequest: (movement: MovementRecord) => void;
}

const SPREADSHEET_COLUMNS: SpreadsheetColumnKey[] = [
  'date',
  'type',
  'category',
  'paymentMethod',
  'amount',
  'note',
];

const COLUMN_HEADERS: Record<SpreadsheetColumnKey, string> = {
  date: 'Fecha',
  type: 'Tipo',
  category: 'Categoria',
  paymentMethod: 'Metodo de pago',
  amount: 'Monto',
  note: 'Nota',
};

const TYPE_LABELS: Record<MovementType, string> = {
  ingreso: 'Ingreso',
  gasto: 'Gasto',
};

const isValidIsoDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map((entry) => Number(entry));
  const candidate = new Date(Date.UTC(year, month - 1, day));

  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
};

const isMovementType = (value: string): value is MovementType => {
  return value === 'ingreso' || value === 'gasto';
};

const buildMovementDraftFromRecord = (movement: MovementRecord): MovementDraft => ({
  type: movement.type,
  amountCents: movement.amountCents,
  category: movement.category,
  date: movement.date,
  paymentMethod: movement.paymentMethod,
  note: movement.note,
});

const createDraftRow = (categories: string[], paymentMethods: string[]): SpreadsheetDraftRow => ({
  key: `draft-${Date.now()}`,
  type: 'gasto',
  amountInput: '',
  category: categories[0] ?? 'Otros',
  date: todayIsoDate(),
  paymentMethod: paymentMethods[0] ?? 'Efectivo',
  note: '',
});

const makeCellErrorKey = (rowKey: string, column: SpreadsheetColumnKey): string => `${rowKey}:${column}`;

const sanitizeCellInput = (column: SpreadsheetColumnKey, value: string): string => {
  if (column === 'amount') {
    return normalizeAmountInput(value);
  }

  return value;
};

const trimOrFallback = (value: string, fallback: string): string => {
  const trimmed = value.trim();
  return trimmed ? trimmed : fallback;
};

export const SpreadsheetTable = ({
  movements,
  search,
  categories,
  paymentMethods,
  onSearchChange,
  onCreateMovement,
  onUpdateMovement,
  onDeleteRequest,
}: SpreadsheetTableProps) => {
  const { pushToast } = useToast();
  const [draftRow, setDraftRow] = useState<SpreadsheetDraftRow | null>(null);
  const [activeCell, setActiveCell] = useState<SpreadsheetCellPosition | null>(null);
  const [editValue, setEditValue] = useState('');
  const [originValue, setOriginValue] = useState('');
  const [cellErrors, setCellErrors] = useState<Record<string, string>>({});
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isUpdatingCell, setIsUpdatingCell] = useState(false);

  const rows = useMemo<SpreadsheetRenderableRow[]>(() => {
    const mappedRows = movements
      .filter((movement): movement is MovementRecord & { id: number } => movement.id !== undefined)
      .map((movement) => ({
        key: `m-${movement.id}`,
        isDraft: false,
        movement,
      }));

    if (!draftRow) {
      return mappedRows;
    }

    return [
      {
        key: draftRow.key,
        isDraft: true,
        draft: draftRow,
      },
      ...mappedRows,
    ];
  }, [draftRow, movements]);

  const rowKeys = useMemo(() => rows.map((row) => row.key), [rows]);
  const moveFrom = useSpreadsheetNavigation(rowKeys, SPREADSHEET_COLUMNS);
  const rowsByKey = useMemo(() => new Map(rows.map((row) => [row.key, row])), [rows]);

  useEffect(() => {
    if (!activeCell) {
      return;
    }

    if (!rowsByKey.has(activeCell.rowKey)) {
      setActiveCell(null);
      setEditValue('');
      setOriginValue('');
    }
  }, [activeCell, rowsByKey]);

  const clearCellError = (rowKey: string, column: SpreadsheetColumnKey) => {
    const targetKey = makeCellErrorKey(rowKey, column);
    setCellErrors((current) => {
      if (!current[targetKey]) {
        return current;
      }

      const next = { ...current };
      delete next[targetKey];
      return next;
    });
  };

  const setCellError = (rowKey: string, column: SpreadsheetColumnKey, message: string) => {
    const targetKey = makeCellErrorKey(rowKey, column);
    setCellErrors((current) => ({ ...current, [targetKey]: message }));
  };

  const clearRowErrors = (rowKey: string) => {
    setCellErrors((current) => {
      const next = { ...current };
      let changed = false;

      for (const key of Object.keys(next)) {
        if (key.startsWith(`${rowKey}:`)) {
          delete next[key];
          changed = true;
        }
      }

      return changed ? next : current;
    });
  };

  const getRawCellValue = (row: SpreadsheetRenderableRow, column: SpreadsheetColumnKey): string => {
    if (row.isDraft && row.draft) {
      const draft = row.draft;
      if (column === 'amount') {
        return draft.amountInput;
      }

      return (
        {
          date: draft.date,
          type: draft.type,
          category: draft.category,
          paymentMethod: draft.paymentMethod,
          note: draft.note,
        }[column] ?? ''
      );
    }

    if (!row.movement) {
      return '';
    }

    const movement = row.movement;
    if (column === 'amount') {
      return formatAmountFromCents(movement.amountCents, { currency: false });
    }

    return (
      {
        date: movement.date,
        type: movement.type,
        category: movement.category,
        paymentMethod: movement.paymentMethod,
        note: movement.note ?? '',
      }[column] ?? ''
    );
  };

  const getDisplayValue = (row: SpreadsheetRenderableRow, column: SpreadsheetColumnKey): string => {
    if (row.isDraft && row.draft) {
      const rawValue = getRawCellValue(row, column);
      if (column === 'amount') {
        const parsed = parseAmountToCents(rawValue);
        if (parsed === null) {
          return rawValue;
        }

        return formatArs(parsed);
      }

      if (column === 'type' && isMovementType(rawValue)) {
        return TYPE_LABELS[rawValue];
      }

      if (column === 'date' && isValidIsoDate(rawValue)) {
        return formatDisplayDate(rawValue);
      }

      return rawValue;
    }

    if (!row.movement) {
      return '';
    }

    const movement = row.movement;
    if (column === 'amount') {
      const sign = movement.type === 'gasto' ? '-' : '+';
      return `${sign}${formatArs(movement.amountCents)}`;
    }

    if (column === 'type') {
      return TYPE_LABELS[movement.type];
    }

    if (column === 'date') {
      return formatDisplayDate(movement.date);
    }

    return (
      {
        category: movement.category,
        paymentMethod: movement.paymentMethod,
        note: movement.note ?? '',
      }[column] ?? ''
    );
  };

  const activateCell = (position: SpreadsheetCellPosition) => {
    const row = rowsByKey.get(position.rowKey);
    if (!row) {
      return;
    }

    const value = getRawCellValue(row, position.column);
    setActiveCell(position);
    setEditValue(value);
    setOriginValue(value);
    clearCellError(position.rowKey, position.column);
  };

  const applyNavigation = (origin: SpreadsheetCellPosition, intent: SpreadsheetNavigationIntent) => {
    if (intent === 'stay') {
      setActiveCell(null);
      return;
    }

    const next = moveFrom(origin, intent);
    if (!next) {
      setActiveCell(null);
      return;
    }

    activateCell(next);
  };

  const onNavigateFromCell = (origin: SpreadsheetCellPosition, intent: SpreadsheetNavigationIntent) => {
    const next = moveFrom(origin, intent);
    if (!next) {
      return;
    }

    activateCell(next);
  };

  const handleCancelActiveCell = () => {
    setEditValue(originValue);
    setActiveCell(null);
  };

  const handleChangeActiveValue = (value: string) => {
    if (!activeCell) {
      return;
    }

    const nextValue = sanitizeCellInput(activeCell.column, value);
    setEditValue(nextValue);
    clearCellError(activeCell.rowKey, activeCell.column);
  };

  const buildMovementDraftFromCell = (
    movement: MovementRecord,
    column: SpreadsheetColumnKey,
    inputValue: string,
  ): { draft: MovementDraft | null; error?: string } => {
    const current = buildMovementDraftFromRecord(movement);
    const trimmedValue = inputValue.trim();
    const defaults = {
      category: categories[0] ?? 'Otros',
      paymentMethod: paymentMethods[0] ?? 'Efectivo',
    };

    if (column === 'amount') {
      const parsed = parseAmountToCents(inputValue);
      if (parsed === null || parsed <= 0) {
        return { draft: null, error: 'Monto invalido. Usa un numero mayor a 0.' };
      }

      return {
        draft: {
          ...current,
          amountCents: parsed,
        },
      };
    }

    if (column === 'date') {
      if (!isValidIsoDate(trimmedValue)) {
        return { draft: null, error: 'Fecha invalida. Usa formato YYYY-MM-DD.' };
      }

      return {
        draft: {
          ...current,
          date: trimmedValue,
        },
      };
    }

    if (column === 'type') {
      if (!isMovementType(trimmedValue)) {
        return { draft: null, error: 'Tipo invalido.' };
      }

      return {
        draft: {
          ...current,
          type: trimmedValue,
        },
      };
    }

    if (column === 'category') {
      return {
        draft: {
          ...current,
          category: trimOrFallback(trimmedValue, defaults.category),
        },
      };
    }

    if (column === 'paymentMethod') {
      return {
        draft: {
          ...current,
          paymentMethod: trimOrFallback(trimmedValue, defaults.paymentMethod),
        },
      };
    }

    return {
      draft: {
        ...current,
        note: trimmedValue || undefined,
      },
    };
  };

  const buildMovementDraftFromDraftRow = (
    row: SpreadsheetDraftRow,
  ): { draft: MovementDraft | null; errors: Partial<Record<SpreadsheetColumnKey, string>> } => {
    const errors: Partial<Record<SpreadsheetColumnKey, string>> = {};
    const amountCents = parseAmountToCents(row.amountInput);
    if (amountCents === null || amountCents <= 0) {
      errors.amount = 'Monto invalido. Usa un numero mayor a 0.';
    }

    if (!isValidIsoDate(row.date)) {
      errors.date = 'Fecha invalida. Usa formato YYYY-MM-DD.';
    }

    if (!isMovementType(row.type)) {
      errors.type = 'Tipo invalido.';
    }

    if (Object.keys(errors).length > 0) {
      return { draft: null, errors };
    }

    const defaults = {
      category: categories[0] ?? 'Otros',
      paymentMethod: paymentMethods[0] ?? 'Efectivo',
    };

    return {
      draft: {
        type: row.type,
        amountCents: amountCents!,
        category: trimOrFallback(row.category, defaults.category),
        date: row.date,
        paymentMethod: trimOrFallback(row.paymentMethod, defaults.paymentMethod),
        note: row.note.trim() || undefined,
      },
      errors,
    };
  };

  const commitDraftCell = (origin: SpreadsheetCellPosition, intent: SpreadsheetNavigationIntent) => {
    if (!draftRow || origin.rowKey !== draftRow.key) {
      return;
    }

    const sanitized = sanitizeCellInput(origin.column, editValue);
    const nextDraft = { ...draftRow };

    if (origin.column === 'amount') {
      nextDraft.amountInput = sanitized;
    } else if (origin.column === 'date') {
      nextDraft.date = sanitized;
    } else if (origin.column === 'type' && isMovementType(sanitized)) {
      nextDraft.type = sanitized;
    } else if (origin.column === 'category') {
      nextDraft.category = sanitized;
    } else if (origin.column === 'paymentMethod') {
      nextDraft.paymentMethod = sanitized;
    } else if (origin.column === 'note') {
      nextDraft.note = sanitized;
    }

    setDraftRow(nextDraft);

    const validation = buildMovementDraftFromDraftRow(nextDraft);
    const message = validation.errors[origin.column];
    if (message) {
      setCellError(origin.rowKey, origin.column, message);
      setEditValue(sanitized);
      return;
    }

    clearCellError(origin.rowKey, origin.column);
    applyNavigation(origin, intent);
  };

  const commitStoredMovementCell = async (
    row: SpreadsheetRenderableRow,
    origin: SpreadsheetCellPosition,
    intent: SpreadsheetNavigationIntent,
  ) => {
    if (!row.movement || row.movement.id === undefined) {
      return;
    }

    const sanitized = sanitizeCellInput(origin.column, editValue);
    const parsed = buildMovementDraftFromCell(row.movement, origin.column, sanitized);
    if (!parsed.draft) {
      setCellError(origin.rowKey, origin.column, parsed.error ?? 'Valor invalido.');
      setEditValue(sanitized);
      return;
    }

    const current = buildMovementDraftFromRecord(row.movement);
    const sameValue =
      current.type === parsed.draft.type &&
      current.amountCents === parsed.draft.amountCents &&
      current.category === parsed.draft.category &&
      current.date === parsed.draft.date &&
      current.paymentMethod === parsed.draft.paymentMethod &&
      (current.note ?? '') === (parsed.draft.note ?? '');

    if (!sameValue) {
      setIsUpdatingCell(true);
      try {
        await onUpdateMovement(row.movement.id, parsed.draft);
      } catch (error) {
        setCellError(
          origin.rowKey,
          origin.column,
          error instanceof Error ? error.message : 'No se pudo guardar el cambio.',
        );
        setIsUpdatingCell(false);
        return;
      } finally {
        setIsUpdatingCell(false);
      }
    }

    clearCellError(origin.rowKey, origin.column);
    applyNavigation(origin, intent);
  };

  const handleCommitActiveCell = async (intent: SpreadsheetNavigationIntent) => {
    if (!activeCell || isUpdatingCell) {
      return;
    }

    const row = rowsByKey.get(activeCell.rowKey);
    if (!row) {
      setActiveCell(null);
      return;
    }

    if (row.isDraft) {
      commitDraftCell(activeCell, intent);
      return;
    }

    await commitStoredMovementCell(row, activeCell, intent);
  };

  const handleAddDraftRow = () => {
    if (draftRow) {
      activateCell({ rowKey: draftRow.key, column: 'amount' });
      return;
    }

    const nextDraftRow = createDraftRow(categories, paymentMethods);
    setDraftRow(nextDraftRow);
    clearRowErrors(nextDraftRow.key);

    requestAnimationFrame(() => {
      activateCell({ rowKey: nextDraftRow.key, column: 'amount' });
    });
  };

  const handleDiscardDraftRow = () => {
    if (!draftRow) {
      return;
    }

    clearRowErrors(draftRow.key);
    if (activeCell?.rowKey === draftRow.key) {
      setActiveCell(null);
    }
    setDraftRow(null);
  };

  const handleSaveDraftRow = async () => {
    if (!draftRow) {
      return;
    }

    const parsed = buildMovementDraftFromDraftRow(draftRow);
    if (!parsed.draft) {
      for (const [column, message] of Object.entries(parsed.errors) as [
        SpreadsheetColumnKey,
        string,
      ][]) {
        setCellError(draftRow.key, column, message);
      }

      const firstError = SPREADSHEET_COLUMNS.find((column) => parsed.errors[column]);
      if (firstError) {
        activateCell({ rowKey: draftRow.key, column: firstError });
      }
      pushToast({
        tone: 'error',
        title: 'Fila incompleta',
        description: 'Completa los campos obligatorios antes de guardar la fila.',
      });
      return;
    }

    setIsSavingDraft(true);
    try {
      await onCreateMovement(parsed.draft);
      clearRowErrors(draftRow.key);
      setDraftRow(null);
      setActiveCell(null);
      pushToast({
        tone: 'success',
        title: 'Fila creada',
        description: 'El movimiento se guardo correctamente.',
      });
    } catch (error) {
      pushToast({
        tone: 'error',
        title: 'No se pudo guardar',
        description: error instanceof Error ? error.message : 'Intenta de nuevo.',
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

  const getColumnOptions = (column: SpreadsheetColumnKey) => {
    if (column === 'type') {
      return [
        { value: 'gasto', label: 'Gasto' },
        { value: 'ingreso', label: 'Ingreso' },
      ];
    }

    if (column === 'category') {
      return categories.map((category) => ({ value: category, label: category }));
    }

    if (column === 'paymentMethod') {
      return paymentMethods.map((method) => ({ value: method, label: method }));
    }

    return undefined;
  };

  const getCellError = (rowKey: string, column: SpreadsheetColumnKey): string | undefined => {
    return cellErrors[makeCellErrorKey(rowKey, column)];
  };

  return (
    <section className="card spreadsheet-card">
      <header className="section-header history-header">
        <h2>Modo planilla</h2>
        <input
          className="field search-field"
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por categoria, nota o fecha"
          aria-label="Buscar movimientos en planilla"
        />
      </header>

      <div className="spreadsheet-toolbar">
        <p className="spreadsheet-help">
          Enter guarda y baja. Tab avanza. Shift+Tab retrocede. Escape cancela.
        </p>
        <button type="button" className="button button-primary" onClick={handleAddDraftRow}>
          + Nueva fila
        </button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No hay movimientos para mostrar"
          description="Proba cambiando filtros o agrega una fila nueva para empezar."
        />
      ) : (
        <div className="spreadsheet-scroll">
          <table className="spreadsheet-table">
            <thead>
              <tr>
                {SPREADSHEET_COLUMNS.map((column) => (
                  <th key={column} scope="col">
                    {COLUMN_HEADERS[column]}
                  </th>
                ))}
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <SpreadsheetRow
                  key={row.key}
                  row={row}
                  columns={SPREADSHEET_COLUMNS}
                  activeCell={activeCell}
                  editValue={editValue}
                  getCellDisplayValue={getDisplayValue}
                  getCellEditValue={getRawCellValue}
                  getCellError={getCellError}
                  getColumnOptions={getColumnOptions}
                  onActivateCell={activateCell}
                  onNavigateFromCell={onNavigateFromCell}
                  onChangeActiveValue={handleChangeActiveValue}
                  onCommitActiveCell={handleCommitActiveCell}
                  onCancelActiveCell={handleCancelActiveCell}
                  onDeleteRequest={onDeleteRequest}
                  onSaveDraft={handleSaveDraftRow}
                  onDiscardDraft={handleDiscardDraftRow}
                  isSavingDraft={isSavingDraft}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
