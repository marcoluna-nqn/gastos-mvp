const normalizeNumberInput = (value: string): string => {
  const trimmed = value.trim().replace(/\s+/g, '');

  if (trimmed.includes(',') && trimmed.includes('.')) {
    const commaPosition = trimmed.lastIndexOf(',');
    const dotPosition = trimmed.lastIndexOf('.');

    if (commaPosition > dotPosition) {
      return trimmed.replaceAll('.', '').replace(',', '.');
    }

    return trimmed.replaceAll(',', '');
  }

  if (trimmed.includes(',')) {
    return trimmed.replace(',', '.');
  }

  return trimmed;
};

export const parseAmountToCents = (value: string): number | null => {
  const normalized = normalizeNumberInput(value);

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed * 100);
};

export const sumCents = (values: number[]): number => {
  return values.reduce((accumulator, current) => accumulator + current, 0);
};
