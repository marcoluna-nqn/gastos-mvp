import type { MovementRecord, MovementType } from '../../types/movement';

export type SpreadsheetColumnKey =
  | 'date'
  | 'type'
  | 'category'
  | 'paymentMethod'
  | 'amount'
  | 'dueDate'
  | 'isPaymentReminder'
  | 'note';
export type SpreadsheetNavigationIntent = 'stay' | 'next' | 'prev' | 'up' | 'down' | 'left' | 'right';

export interface SpreadsheetCellPosition {
  rowKey: string;
  column: SpreadsheetColumnKey;
}

export interface SpreadsheetDraftRow {
  key: string;
  type: MovementType;
  amountInput: string;
  category: string;
  date: string;
  dueDate: string;
  isPaymentReminder: string;
  paymentMethod: string;
  note: string;
}

export interface SpreadsheetRenderableRow {
  key: string;
  isDraft: boolean;
  movement?: MovementRecord;
  draft?: SpreadsheetDraftRow;
}
