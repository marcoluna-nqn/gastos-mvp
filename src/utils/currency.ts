import { CURRENCY_CODE, CURRENCY_LOCALE } from '../constants/options';

const currencyFormatter = new Intl.NumberFormat(CURRENCY_LOCALE, {
  style: 'currency',
  currency: CURRENCY_CODE,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const decimalFormatter = new Intl.NumberFormat(CURRENCY_LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatArs = (amountCents: number): string => {
  return currencyFormatter.format(amountCents / 100);
};

export const formatAmountFromCents = (
  amountCents: number,
  options: { currency?: boolean } = {},
): string => {
  if (options.currency ?? true) {
    return formatArs(amountCents);
  }

  return decimalFormatter.format(amountCents / 100);
};
