import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export const todayIsoDate = (): string => {
  return new Date().toISOString().slice(0, 10);
};

export const toMonthKey = (isoDate: string): string => {
  return isoDate.slice(0, 7);
};

export const formatMonthLabel = (monthKey: string): string => {
  const parsed = parseISO(`${monthKey}-01`);
  return format(parsed, 'LLLL yyyy', { locale: es });
};

export const formatDisplayDate = (isoDate: string): string => {
  const parsed = parseISO(isoDate);
  return format(parsed, 'dd/MM/yyyy', { locale: es });
};

export const fileSafeDate = (): string => {
  return new Date().toISOString().slice(0, 19).replaceAll(':', '-');
};
