import { formatAmountFromCents } from '../utils/currency';
import { parseAmountToCents } from '../utils/math';
import type { MovementDraft, MovementRecord, MovementType } from '../types/movement';

const JSON_BACKUP_VERSION = 1;

type JsonMovement = {
  type: MovementType;
  amountCents?: number;
  amount?: number | string;
  category: string;
  date: string;
  paymentMethod: string;
  note?: string;
};

const isMovementType = (value: unknown): value is MovementType => {
  return value === 'ingreso' || value === 'gasto';
};

const isIsoDate = (value: string): boolean => {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
};

const parseMovementLike = (value: unknown): MovementDraft | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as JsonMovement;
  if (
    !isMovementType(candidate.type) ||
    typeof candidate.category !== 'string' ||
    typeof candidate.date !== 'string' ||
    typeof candidate.paymentMethod !== 'string' ||
    !isIsoDate(candidate.date)
  ) {
    return null;
  }

  let amountCents: number | null = null;

  if (typeof candidate.amountCents === 'number' && Number.isFinite(candidate.amountCents)) {
    amountCents = Math.round(candidate.amountCents);
  } else if (typeof candidate.amount === 'number') {
    amountCents = Math.round(candidate.amount * 100);
  } else if (typeof candidate.amount === 'string') {
    amountCents = parseAmountToCents(candidate.amount);
  }

  if (amountCents === null || amountCents <= 0) {
    return null;
  }

  const trimmedCategory = candidate.category.trim();
  const trimmedMethod = candidate.paymentMethod.trim();
  if (!trimmedCategory || !trimmedMethod) {
    return null;
  }

  return {
    type: candidate.type,
    amountCents,
    category: trimmedCategory,
    date: candidate.date,
    paymentMethod: trimmedMethod,
    note: candidate.note?.trim() || undefined,
  };
};

export const exportAsJson = (movements: MovementRecord[]): string => {
  return JSON.stringify(
    {
      version: JSON_BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      items: movements.map((movement) => ({
        id: movement.id,
        type: movement.type,
        amountCents: movement.amountCents,
        amount: Number((movement.amountCents / 100).toFixed(2)),
        category: movement.category,
        date: movement.date,
        paymentMethod: movement.paymentMethod,
        note: movement.note ?? '',
      })),
    },
    null,
    2,
  );
};

const escapeCsv = (value: string): string => {
  const safe = value.replaceAll('"', '""');
  return `"${safe}"`;
};

export const exportAsCsv = (movements: MovementRecord[]): string => {
  const headers = ['id', 'tipo', 'monto', 'categoria', 'fecha', 'metodo_pago', 'nota'];
  const rows = movements.map((item) =>
    [
      String(item.id ?? ''),
      item.type,
      formatAmountFromCents(item.amountCents, { currency: false }),
      item.category,
      item.date,
      item.paymentMethod,
      item.note ?? '',
    ]
      .map((field) => escapeCsv(field))
      .join(','),
  );

  return [headers.join(','), ...rows].join('\n');
};

export const downloadBlobFile = (blob: Blob, filename: string): void => {
  const navigatorWithMsSave = window.navigator as Navigator & {
    msSaveOrOpenBlob?: (blobToSave: Blob, defaultName?: string) => boolean;
  };

  if (navigatorWithMsSave.msSaveOrOpenBlob) {
    navigatorWithMsSave.msSaveOrOpenBlob(blob, filename);
    return;
  }

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
    link.remove();
  }, 0);
};

export const downloadTextFile = (content: string, filename: string, mimeType: string): void => {
  downloadBlobFile(new Blob([content], { type: mimeType }), filename);
};

export const parseJsonBackup = (raw: string): MovementDraft[] => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('El archivo JSON no es válido.');
  }

  const source =
    Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && Array.isArray((parsed as { items?: unknown }).items)
        ? (parsed as { items: unknown[] }).items
        : null;

  if (!source) {
    throw new Error('El JSON no tiene el formato esperado.');
  }

  const parsedItems = source
    .map((entry) => parseMovementLike(entry))
    .filter((entry): entry is MovementDraft => entry !== null);

  if (parsedItems.length === 0) {
    throw new Error('No se encontraron movimientos válidos en el archivo.');
  }

  return parsedItems;
};
