import type { MovementRecord } from '../../types/movement';
import { SpreadsheetCell } from './SpreadsheetCell';
import type {
  SpreadsheetCellPosition,
  SpreadsheetColumnKey,
  SpreadsheetNavigationIntent,
  SpreadsheetRenderableRow,
} from './types';

interface SpreadsheetOption {
  value: string;
  label: string;
}

interface SpreadsheetRowProps {
  row: SpreadsheetRenderableRow;
  columns: SpreadsheetColumnKey[];
  activeCell: SpreadsheetCellPosition | null;
  editValue: string;
  getCellDisplayValue: (row: SpreadsheetRenderableRow, column: SpreadsheetColumnKey) => string;
  getCellEditValue: (row: SpreadsheetRenderableRow, column: SpreadsheetColumnKey) => string;
  getCellError: (rowKey: string, column: SpreadsheetColumnKey) => string | undefined;
  getColumnOptions: (column: SpreadsheetColumnKey) => SpreadsheetOption[] | undefined;
  onActivateCell: (position: SpreadsheetCellPosition) => void;
  onNavigateFromCell: (position: SpreadsheetCellPosition, intent: SpreadsheetNavigationIntent) => void;
  onChangeActiveValue: (value: string) => void;
  onCommitActiveCell: (intent: SpreadsheetNavigationIntent) => Promise<void>;
  onCancelActiveCell: () => void;
  onDeleteRequest: (movement: MovementRecord) => void;
  onDuplicateRequest: (movement: MovementRecord) => Promise<number | null>;
  onSaveDraft: () => void;
  onDiscardDraft: () => void;
  isSavingDraft: boolean;
  isHighlighted?: boolean;
}

export const SpreadsheetRow = ({
  row,
  columns,
  activeCell,
  editValue,
  getCellDisplayValue,
  getCellEditValue,
  getCellError,
  getColumnOptions,
  onActivateCell,
  onNavigateFromCell,
  onChangeActiveValue,
  onCommitActiveCell,
  onCancelActiveCell,
  onDeleteRequest,
  onDuplicateRequest,
  onSaveDraft,
  onDiscardDraft,
  isSavingDraft,
  isHighlighted = false,
}: SpreadsheetRowProps) => {
  const movement = row.movement;

  return (
    <tr
      className={`spreadsheet-row ${row.isDraft ? 'is-draft' : ''} ${
        isHighlighted ? 'is-highlighted' : ''
      }`}
    >
      {columns.map((column) => {
        const position: SpreadsheetCellPosition = { rowKey: row.key, column };
        const isActive = activeCell?.rowKey === row.key && activeCell.column === column;

        return (
          <SpreadsheetCell
            key={`${row.key}-${column}`}
            column={column}
            isActive={isActive}
            displayValue={getCellDisplayValue(row, column)}
            editValue={isActive ? editValue : getCellEditValue(row, column)}
            error={getCellError(row.key, column)}
            options={getColumnOptions(column)}
            onActivate={() => onActivateCell(position)}
            onNavigate={(intent) => onNavigateFromCell(position, intent)}
            onChange={onChangeActiveValue}
            onCommit={onCommitActiveCell}
            onCancel={onCancelActiveCell}
          />
        );
      })}

      <td className="spreadsheet-cell action-cell">
        {row.isDraft ? (
          <div className="sheet-actions">
            <button
              type="button"
              className="button button-primary compact"
              onClick={onSaveDraft}
              disabled={isSavingDraft}
            >
              {isSavingDraft ? 'Guardando...' : 'Guardar fila'}
            </button>
            <button type="button" className="button button-secondary compact" onClick={onDiscardDraft}>
              Cancelar
            </button>
          </div>
        ) : movement ? (
          <div className="sheet-actions">
            <button
              type="button"
              className="button button-secondary compact"
              onClick={() => {
                void onDuplicateRequest(movement);
              }}
            >
              Duplicar
            </button>
            <button
              type="button"
              className="button button-danger ghost compact"
              onClick={() => onDeleteRequest(movement)}
            >
              Eliminar
            </button>
          </div>
        ) : null}
      </td>
    </tr>
  );
};
