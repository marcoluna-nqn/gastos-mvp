import { useEffect, useMemo, useRef, type KeyboardEvent } from 'react';
import type { SpreadsheetColumnKey, SpreadsheetNavigationIntent } from './types';

interface OptionItem {
  value: string;
  label: string;
}

interface SpreadsheetCellProps {
  column: SpreadsheetColumnKey;
  isActive: boolean;
  displayValue: string;
  editValue: string;
  placeholder?: string;
  error?: string;
  options?: OptionItem[];
  onActivate: () => void;
  onNavigate: (intent: SpreadsheetNavigationIntent) => void;
  onChange: (value: string) => void;
  onCommit: (intent: SpreadsheetNavigationIntent) => void;
  onCancel: () => void;
}

const isSelectColumn = (column: SpreadsheetColumnKey): boolean => {
  return column === 'type' || column === 'category' || column === 'paymentMethod';
};

export const SpreadsheetCell = ({
  column,
  isActive,
  displayValue,
  editValue,
  placeholder = '-',
  error,
  options,
  onActivate,
  onNavigate,
  onChange,
  onCommit,
  onCancel,
}: SpreadsheetCellProps) => {
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>(null);
  const skipBlurCommitRef = useRef(false);
  const textForDisplay = useMemo(() => (displayValue ? displayValue : placeholder), [displayValue, placeholder]);

  useEffect(() => {
    if (!isActive || !inputRef.current) {
      return;
    }

    inputRef.current.focus({ preventScroll: true });
    if (column === 'amount' && inputRef.current instanceof HTMLInputElement) {
      inputRef.current.select();
    }
  }, [column, isActive]);

  const handleEditingKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      skipBlurCommitRef.current = true;
      onCancel();
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      skipBlurCommitRef.current = true;
      onCommit(event.shiftKey ? 'prev' : 'next');
      return;
    }

    if (event.key === 'Enter') {
      if (column === 'note' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        skipBlurCommitRef.current = true;
        onCommit('down');
        return;
      }

      if (column === 'note') {
        return;
      }

      event.preventDefault();
      skipBlurCommitRef.current = true;
      onCommit('down');
      return;
    }

    if (
      event.key === 'ArrowDown' ||
      event.key === 'ArrowUp' ||
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight'
    ) {
      if (column === 'note' || column === 'amount') {
        return;
      }

      event.preventDefault();
      skipBlurCommitRef.current = true;
      const direction: SpreadsheetNavigationIntent =
        event.key === 'ArrowDown'
          ? 'down'
          : event.key === 'ArrowUp'
            ? 'up'
            : event.key === 'ArrowLeft'
              ? 'left'
              : 'right';
      onCommit(direction);
    }
  };

  const handleDisplayKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onActivate();
      return;
    }

    const direction: SpreadsheetNavigationIntent | null =
      event.key === 'ArrowDown'
        ? 'down'
        : event.key === 'ArrowUp'
          ? 'up'
          : event.key === 'ArrowLeft'
            ? 'left'
            : event.key === 'ArrowRight'
              ? 'right'
              : null;

    if (!direction) {
      return;
    }

    event.preventDefault();
    onNavigate(direction);
  };

  const handleBlur = () => {
    if (skipBlurCommitRef.current) {
      skipBlurCommitRef.current = false;
      return;
    }

    onCommit('stay');
  };

  return (
    <td className={`spreadsheet-cell ${isActive ? 'is-active' : ''} ${error ? 'has-error' : ''}`} title={error}>
      {isActive ? (
        isSelectColumn(column) ? (
          <select
            ref={(element) => {
              inputRef.current = element;
            }}
            className={`sheet-editor field sheet-editor-${column}`}
            value={editValue}
            onChange={(event) => onChange(event.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleEditingKeyDown}
            aria-invalid={Boolean(error)}
          >
            {options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : column === 'note' ? (
          <textarea
            ref={(element) => {
              inputRef.current = element;
            }}
            className={`sheet-editor field sheet-editor-${column}`}
            rows={2}
            value={editValue}
            onChange={(event) => onChange(event.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleEditingKeyDown}
            aria-invalid={Boolean(error)}
          />
        ) : (
          <input
            ref={(element) => {
              inputRef.current = element;
            }}
            className={`sheet-editor field sheet-editor-${column}`}
            type={column === 'date' ? 'date' : 'text'}
            inputMode={column === 'amount' ? 'decimal' : 'text'}
            pattern={column === 'amount' ? '[0-9.,]*' : undefined}
            enterKeyHint="next"
            value={editValue}
            onChange={(event) => onChange(event.target.value)}
            onBlur={handleBlur}
            onFocus={(event) => {
              if (column === 'amount') {
                event.currentTarget.select();
              }
            }}
            onKeyDown={handleEditingKeyDown}
            aria-invalid={Boolean(error)}
          />
        )
      ) : (
        <button
          type="button"
          className={`sheet-display sheet-display-${column}`}
          onClick={onActivate}
          onKeyDown={handleDisplayKeyDown}
        >
          {textForDisplay}
        </button>
      )}
    </td>
  );
};
