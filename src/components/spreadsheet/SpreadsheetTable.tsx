import { useEffect, useMemo, useState, type ClipboardEvent } from 'react';
import { DEFAULT_CATEGORY_NAME } from '../../constants/options';
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
  onCreateMovement: (draft: MovementDraft) => Promise<number>;
  onUpdateMovement: (id: number, draft: MovementDraft) => Promise<void>;
  onDeleteRequest: (movement: MovementRecord) => void;
  onDuplicateMovement: (movement: MovementRecord) => Promise<number | null>;
}

interface LooseRowInput {
  type: string;
  amountInput: string;
  category: string;
  date: string;
  paymentMethod: string;
  note: string;
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

const parseMovementIdFromRowKey = (rowKey: string): number | null => {
  if (!rowKey.startsWith('m-')) {
    return null;
  }

  const parsed = Number(rowKey.slice(2));
  return Number.isInteger(parsed) ? parsed : null;
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

const padTwo = (value: string): string => value.padStart(2, '0');

const normalizeFlexibleDateInput = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (isValidIsoDate(trimmed)) {
    return trimmed;
  }

  const withSlash = trimmed.match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})$/);
  if (withSlash) {
    const iso = `${withSlash[3]}-${padTwo(withSlash[2])}-${padTwo(withSlash[1])}`;
    return isValidIsoDate(iso) ? iso : null;
  }

  const yearFirst = trimmed.match(/^(\d{4})[/. -](\d{1,2})[/. -](\d{1,2})$/);
  if (yearFirst) {
    const iso = `${yearFirst[1]}-${padTwo(yearFirst[2])}-${padTwo(yearFirst[3])}`;
    return isValidIsoDate(iso) ? iso : null;
  }

  return null;
};

const normalizeTypeInput = (value: string): MovementType | null => {
  const normalized = value
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (!normalized) {
    return null;
  }

  if (
    normalized === 'ingreso' ||
    normalized === 'ingresos' ||
    normalized === 'i' ||
    normalized === 'income'
  ) {
    return 'ingreso';
  }

  if (
    normalized === 'gasto' ||
    normalized === 'gastos' ||
    normalized === 'egreso' ||
    normalized === 'egresos' ||
    normalized === 'g' ||
    normalized === 'expense'
  ) {
    return 'gasto';
  }

  return null;
};

const parseClipboardMatrix = (rawText: string): string[][] => {
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows = normalized.split('\n');
  while (rows.length > 0 && !rows[rows.length - 1].trim()) {
    rows.pop();
  }

  const matrix = rows
    .map((row) => row.split('\t'))
    .filter((row) => row.some((cell) => cell.trim().length > 0));

  if (matrix.length === 0) {
    return [];
  }

  const firstRow = matrix[0].map((cell) =>
    cell
      .trim()
      .toLocaleLowerCase('es')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''),
  );

  const looksLikeHeader =
    firstRow[0] === 'fecha' &&
    firstRow[1]?.startsWith('tipo') &&
    firstRow[4]?.startsWith('monto');

  return looksLikeHeader ? matrix.slice(1) : matrix;
};

const buildMovementDraftFromRecord = (movement: MovementRecord): MovementDraft => ({
  type: movement.type,
  amountCents: movement.amountCents,
  category: movement.category,
  date: movement.date,
  paymentMethod: movement.paymentMethod,
  note: movement.note,
});

const buildLooseRowFromMovement = (movement: MovementRecord): LooseRowInput => ({
  type: movement.type,
  amountInput: formatAmountFromCents(movement.amountCents, { currency: false }),
  category: movement.category,
  date: movement.date,
  paymentMethod: movement.paymentMethod,
  note: movement.note ?? '',
});

const createLooseDefaultRow = (categories: string[], paymentMethods: string[]): LooseRowInput => ({
  type: 'gasto',
  amountInput: '',
  category: categories[0] ?? DEFAULT_CATEGORY_NAME,
  date: todayIsoDate(),
  paymentMethod: paymentMethods[0] ?? 'Efectivo',
  note: '',
});

const createDraftRow = (categories: string[], paymentMethods: string[]): SpreadsheetDraftRow => ({
  key: `draft-${Date.now()}`,
  type: 'gasto',
  amountInput: '',
  category: categories[0] ?? DEFAULT_CATEGORY_NAME,
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

const buildMovementDraftFromLooseRow = (
  row: LooseRowInput,
  options: { defaultCategory: string; defaultPaymentMethod: string },
): { draft: MovementDraft | null; errors: Partial<Record<SpreadsheetColumnKey, string>> } => {
  const errors: Partial<Record<SpreadsheetColumnKey, string>> = {};

  const normalizedType = normalizeTypeInput(row.type);
  if (!normalizedType) {
    errors.type = 'Tipo invalido.';
  }

  const normalizedDate = normalizeFlexibleDateInput(row.date);
  if (!normalizedDate) {
    errors.date = 'Fecha invalida.';
  }

  const amountCents = parseAmountToCents(row.amountInput);
  if (amountCents === null || amountCents <= 0) {
    errors.amount = 'Monto invalido. Usa un numero mayor a 0.';
  }

  if (Object.keys(errors).length > 0) {
    return { draft: null, errors };
  }

  return {
    draft: {
      type: normalizedType!,
      amountCents: amountCents!,
      category: trimOrFallback(row.category, options.defaultCategory),
      date: normalizedDate!,
      paymentMethod: trimOrFallback(row.paymentMethod, options.defaultPaymentMethod),
      note: row.note.trim() || undefined,
    },
    errors,
  };
};

const applyPasteValueToLooseRow = (
  row: LooseRowInput,
  column: SpreadsheetColumnKey,
  value: string,
): LooseRowInput => {
  const next = { ...row };
  const trimmed = value.trim();

  if (column === 'amount') {
    next.amountInput = normalizeAmountInput(value);
    return next;
  }

  if (column === 'date') {
    next.date = normalizeFlexibleDateInput(value) ?? trimmed;
    return next;
  }

  if (column === 'type') {
    next.type = normalizeTypeInput(value) ?? trimmed;
    return next;
  }

  if (column === 'category') {
    next.category = trimmed;
    return next;
  }

  if (column === 'paymentMethod') {
    next.paymentMethod = trimmed;
    return next;
  }

  next.note = value;
  return next;
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
  onDuplicateMovement,
}: SpreadsheetTableProps) => {
  const { pushToast } = useToast();
  const [draftRow, setDraftRow] = useState<SpreadsheetDraftRow | null>(null);
  const [activeCell, setActiveCell] = useState<SpreadsheetCellPosition | null>(null);
  const [editValue, setEditValue] = useState('');
  const [originValue, setOriginValue] = useState('');
  const [cellErrors, setCellErrors] = useState<Record<string, string>>({});
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isUpdatingCell, setIsUpdatingCell] = useState(false);
  const [pendingFocusMovementId, setPendingFocusMovementId] = useState<number | null>(null);
  const [highlightedRowKeys, setHighlightedRowKeys] = useState<string[]>([]);

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
  const defaults = useMemo(
    () => ({
      category: categories[0] ?? DEFAULT_CATEGORY_NAME,
      paymentMethod: paymentMethods[0] ?? 'Efectivo',
    }),
    [categories, paymentMethods],
  );

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

  useEffect(() => {
    if (!pendingFocusMovementId) {
      return;
    }

    const rowKey = `m-${pendingFocusMovementId}`;
    const row = rowsByKey.get(rowKey);
    if (!row) {
      return;
    }

    const value = row.movement
      ? formatAmountFromCents(row.movement.amountCents, { currency: false })
      : '';
    setActiveCell({ rowKey, column: 'amount' });
    setEditValue(value);
    setOriginValue(value);
    setPendingFocusMovementId(null);
    setHighlightedRowKeys((current) => [...new Set([...current, rowKey])]);
  }, [pendingFocusMovementId, rowsByKey]);

  useEffect(() => {
    if (!pendingFocusMovementId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPendingFocusMovementId(null);
    }, 1600);

    return () => window.clearTimeout(timeoutId);
  }, [pendingFocusMovementId]);

  useEffect(() => {
    if (highlightedRowKeys.length === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setHighlightedRowKeys([]);
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [highlightedRowKeys]);

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

      if (column === 'type') {
        const normalizedType = normalizeTypeInput(rawValue);
        return normalizedType ? TYPE_LABELS[normalizedType] : rawValue;
      }

      if (column === 'date') {
        const normalizedDate = normalizeFlexibleDateInput(rawValue);
        return normalizedDate ? formatDisplayDate(normalizedDate) : rawValue;
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
    const current = buildLooseRowFromMovement(movement);
    const nextRow = applyPasteValueToLooseRow(current, column, inputValue);
    const parsed = buildMovementDraftFromLooseRow(nextRow, {
      defaultCategory: defaults.category,
      defaultPaymentMethod: defaults.paymentMethod,
    });

    if (!parsed.draft) {
      return {
        draft: null,
        error: parsed.errors[column] ?? 'Valor invalido.',
      };
    }

    return { draft: parsed.draft };
  };

  const buildMovementDraftFromDraftRow = (
    row: SpreadsheetDraftRow,
  ): { draft: MovementDraft | null; errors: Partial<Record<SpreadsheetColumnKey, string>> } => {
    return buildMovementDraftFromLooseRow(
      {
        type: row.type,
        amountInput: row.amountInput,
        category: row.category,
        date: row.date,
        paymentMethod: row.paymentMethod,
        note: row.note,
      },
      {
        defaultCategory: defaults.category,
        defaultPaymentMethod: defaults.paymentMethod,
      },
    );
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
      nextDraft.date = normalizeFlexibleDateInput(sanitized) ?? sanitized;
    } else if (origin.column === 'type') {
      nextDraft.type = normalizeTypeInput(sanitized) ?? nextDraft.type;
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
      const createdId = await onCreateMovement(parsed.draft);
      clearRowErrors(draftRow.key);
      setDraftRow(null);
      setActiveCell(null);
      setPendingFocusMovementId(createdId);
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

  const handleDuplicateFromRow = async (movement: MovementRecord): Promise<number | null> => {
    const duplicatedId = await onDuplicateMovement(movement);
    if (duplicatedId) {
      setPendingFocusMovementId(duplicatedId);
    }
    return duplicatedId;
  };

  const handleSpreadsheetPaste = async (event: ClipboardEvent<HTMLDivElement>) => {
    if (!activeCell) {
      return;
    }

    const clipboardText = event.clipboardData.getData('text/plain');
    const matrix = parseClipboardMatrix(clipboardText);
    if (matrix.length === 0) {
      return;
    }

    if (matrix.length === 1 && matrix[0]?.length === 1) {
      return;
    }

    event.preventDefault();

    const startColumnIndex = SPREADSHEET_COLUMNS.findIndex((column) => column === activeCell.column);
    if (startColumnIndex < 0) {
      return;
    }

    const activeMovementId = parseMovementIdFromRowKey(activeCell.rowKey);
    let startMovementIndex =
      activeMovementId === null
        ? movements.length
        : movements.findIndex((movement) => movement.id === activeMovementId);

    if (startMovementIndex < 0) {
      startMovementIndex = movements.length;
    }

    const updatedRowKeys: string[] = [];
    const createdIds: number[] = [];
    let successCount = 0;
    let errorCount = 0;
    const errorSamples: string[] = [];

    for (let rowOffset = 0; rowOffset < matrix.length; rowOffset += 1) {
      const rowCells = matrix[rowOffset];
      const targetMovement = movements[startMovementIndex + rowOffset];
      let workingRow = targetMovement
        ? buildLooseRowFromMovement(targetMovement)
        : createLooseDefaultRow(categories, paymentMethods);

      for (let columnOffset = 0; columnOffset < rowCells.length; columnOffset += 1) {
        const targetColumnIndex = startColumnIndex + columnOffset;
        if (targetColumnIndex >= SPREADSHEET_COLUMNS.length) {
          break;
        }

        const targetColumn = SPREADSHEET_COLUMNS[targetColumnIndex];
        workingRow = applyPasteValueToLooseRow(workingRow, targetColumn, rowCells[columnOffset] ?? '');
      }

      const parsed = buildMovementDraftFromLooseRow(workingRow, {
        defaultCategory: defaults.category,
        defaultPaymentMethod: defaults.paymentMethod,
      });

      if (!parsed.draft) {
        errorCount += 1;
        if (errorSamples.length < 3) {
          const detail =
            parsed.errors.amount ??
            parsed.errors.date ??
            parsed.errors.type ??
            'Fila invalida.';
          errorSamples.push(`Fila ${rowOffset + 1}: ${detail}`);
        }
        continue;
      }

      try {
        if (targetMovement?.id !== undefined) {
          await onUpdateMovement(targetMovement.id, parsed.draft);
          updatedRowKeys.push(`m-${targetMovement.id}`);
        } else {
          const createdId = await onCreateMovement(parsed.draft);
          createdIds.push(createdId);
        }
        successCount += 1;
      } catch (error) {
        errorCount += 1;
        if (errorSamples.length < 3) {
          errorSamples.push(
            `Fila ${rowOffset + 1}: ${
              error instanceof Error ? error.message : 'No se pudo guardar.'
            }`,
          );
        }
      }
    }

    if (successCount > 0) {
      const uniqueUpdated = [...new Set(updatedRowKeys)];
      if (uniqueUpdated.length > 0) {
        setHighlightedRowKeys(uniqueUpdated);
      }
      if (createdIds.length > 0) {
        setPendingFocusMovementId(createdIds[createdIds.length - 1]);
      }
    }

    if (successCount === 0 && errorCount > 0) {
      pushToast({
        tone: 'error',
        title: 'Pegado sin filas validas',
        description: errorSamples.join(' | '),
      });
      return;
    }

    if (errorCount === 0) {
      pushToast({
        tone: 'success',
        title: 'Pegado completado',
        description: `Se aplicaron ${successCount} fila(s).`,
      });
      return;
    }

    pushToast({
      tone: 'info',
      title: 'Pegado parcial',
      description: `${successCount} fila(s) aplicadas, ${errorCount} con error. ${errorSamples.join(' | ')}`,
    });
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
          Enter guarda y baja. Tab avanza. Shift+Tab retrocede. Escape cancela. Pega multiples filas con Ctrl+V.
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
        <div className="spreadsheet-scroll" onPaste={(event) => void handleSpreadsheetPaste(event)}>
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
                  onDuplicateRequest={handleDuplicateFromRow}
                  onSaveDraft={handleSaveDraftRow}
                  onDiscardDraft={handleDiscardDraftRow}
                  isSavingDraft={isSavingDraft}
                  isHighlighted={highlightedRowKeys.includes(row.key)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
