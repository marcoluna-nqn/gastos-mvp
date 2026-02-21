import { useCallback } from 'react';
import type {
  SpreadsheetCellPosition,
  SpreadsheetColumnKey,
  SpreadsheetNavigationIntent,
} from '../components/spreadsheet/types';

const resolveTargetIndices = (
  rowIndex: number,
  columnIndex: number,
  rowCount: number,
  columnCount: number,
  intent: SpreadsheetNavigationIntent,
): { rowIndex: number; columnIndex: number } | null => {
  if (intent === 'stay') {
    return { rowIndex, columnIndex };
  }

  if (intent === 'down') {
    const nextRow = rowIndex + 1;
    if (nextRow >= rowCount) {
      return null;
    }

    return { rowIndex: nextRow, columnIndex };
  }

  if (intent === 'up') {
    const previousRow = rowIndex - 1;
    if (previousRow < 0) {
      return null;
    }

    return { rowIndex: previousRow, columnIndex };
  }

  if (intent === 'left') {
    const previousColumn = columnIndex - 1;
    if (previousColumn < 0) {
      return null;
    }

    return { rowIndex, columnIndex: previousColumn };
  }

  if (intent === 'right') {
    const nextColumn = columnIndex + 1;
    if (nextColumn >= columnCount) {
      return null;
    }

    return { rowIndex, columnIndex: nextColumn };
  }

  if (intent === 'next') {
    const nextColumn = columnIndex + 1;
    if (nextColumn < columnCount) {
      return { rowIndex, columnIndex: nextColumn };
    }

    const nextRow = rowIndex + 1;
    if (nextRow >= rowCount) {
      return null;
    }

    return { rowIndex: nextRow, columnIndex: 0 };
  }

  if (intent === 'prev') {
    const previousColumn = columnIndex - 1;
    if (previousColumn >= 0) {
      return { rowIndex, columnIndex: previousColumn };
    }

    const previousRow = rowIndex - 1;
    if (previousRow < 0) {
      return null;
    }

    return { rowIndex: previousRow, columnIndex: columnCount - 1 };
  }

  return null;
};

export const useSpreadsheetNavigation = (
  rowKeys: string[],
  columnKeys: SpreadsheetColumnKey[],
) => {
  return useCallback(
    (current: SpreadsheetCellPosition, intent: SpreadsheetNavigationIntent): SpreadsheetCellPosition | null => {
      const rowIndex = rowKeys.findIndex((rowKey) => rowKey === current.rowKey);
      const columnIndex = columnKeys.findIndex((column) => column === current.column);
      if (rowIndex < 0 || columnIndex < 0) {
        return null;
      }

      const next = resolveTargetIndices(
        rowIndex,
        columnIndex,
        rowKeys.length,
        columnKeys.length,
        intent,
      );
      if (!next) {
        return null;
      }

      return {
        rowKey: rowKeys[next.rowIndex],
        column: columnKeys[next.columnIndex],
      };
    },
    [columnKeys, rowKeys],
  );
};
