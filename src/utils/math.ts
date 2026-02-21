const normalizeNumberInput = (value: string): string => {
  const cleaned = value
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^\d,.-]/g, '');

  if (!cleaned) {
    return '';
  }

  if (cleaned.includes('-')) {
    return cleaned;
  }

  if (cleaned.includes(',') && cleaned.includes('.')) {
    const commaPosition = cleaned.lastIndexOf(',');
    const dotPosition = cleaned.lastIndexOf('.');

    if (commaPosition > dotPosition) {
      return cleaned.replaceAll('.', '').replace(',', '.');
    }

    return cleaned.replaceAll(',', '');
  }

  if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    if (parts.length > 2) {
      const decimal = parts.pop() ?? '';
      const integer = parts.join('');
      return decimal.length <= 2 ? `${integer}.${decimal}` : `${integer}${decimal}`;
    }

    const decimal = parts[1] ?? '';
    if (decimal.length === 3) {
      return cleaned.replace(',', '');
    }

    return cleaned.replace(',', '.');
  }

  if (cleaned.includes('.')) {
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      const decimal = parts.pop() ?? '';
      const integer = parts.join('');
      return decimal.length <= 2 ? `${integer}.${decimal}` : `${integer}${decimal}`;
    }

    const decimal = parts[1] ?? '';
    if (decimal.length === 3) {
      return cleaned.replace('.', '');
    }
  }

  return cleaned;
};

export const normalizeAmountInput = (value: string): string => {
  return value
    .replace(/[^\d.,]/g, '')
    .replace(/^0+(?=\d)/, '0')
    .slice(0, 18);
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
