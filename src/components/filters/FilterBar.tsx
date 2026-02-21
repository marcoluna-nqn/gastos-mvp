import { useMemo, useState } from 'react';
import type { MovementFilters, MovementTypeFilter } from '../../types/movement';
import { formatMonthLabel } from '../../utils/date';

interface FilterBarProps {
  filters: MovementFilters;
  categories: string[];
  months: string[];
  compact?: boolean;
  onChange: (next: MovementFilters) => void;
}

const TYPE_FILTER_LABELS: Record<MovementTypeFilter, string> = {
  all: 'Todos',
  ingreso: 'Ingresos',
  gasto: 'Gastos',
};

export const FilterBar = ({ filters, categories, months, compact = false, onChange }: FilterBarProps) => {
  const [showCompactAdvanced, setShowCompactAdvanced] = useState(false);
  const showAdvanced = !compact || showCompactAdvanced;

  const hasAdvancedFilters = useMemo(
    () => filters.category !== 'all' || filters.type !== 'all',
    [filters.category, filters.type],
  );

  const updateField = <Key extends keyof MovementFilters>(key: Key, value: MovementFilters[Key]) => {
    onChange({
      ...filters,
      [key]: value,
    });
  };

  return (
    <section className={`card filter-card ${compact ? 'filter-card-compact' : ''}`}>
      <div className="filters-row">
        <label className="field-label" htmlFor="filter-month">
          Mes
        </label>
        <select
          id="filter-month"
          className="field"
          value={filters.month}
          onChange={(event) => updateField('month', event.target.value)}
        >
          <option value="all">Todos los meses</option>
          {months.map((month) => (
            <option key={month} value={month}>
              {formatMonthLabel(month)}
            </option>
          ))}
        </select>
      </div>

      {compact ? (
        <button
          type="button"
          className="text-button filters-toggle"
          onClick={() => setShowCompactAdvanced((current) => !current)}
          aria-expanded={showAdvanced}
        >
          {showAdvanced ? 'Ocultar filtros avanzados' : 'Mas filtros'}
        </button>
      ) : null}

      {!showAdvanced && compact && hasAdvancedFilters ? (
        <p className="filters-summary">
          Categoria: {filters.category === 'all' ? 'Todas' : filters.category} | Tipo: {TYPE_FILTER_LABELS[filters.type]}
        </p>
      ) : null}

      {showAdvanced ? (
        <>
          <div className="filters-row">
            <label className="field-label" htmlFor="filter-category">
              Categoria
            </label>
            <select
              id="filter-category"
              className="field"
              value={filters.category}
              onChange={(event) => updateField('category', event.target.value)}
            >
              <option value="all">Todas las categorias</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="segmented-control" role="tablist" aria-label="Filtrar por tipo">
            {(['all', 'ingreso', 'gasto'] as MovementTypeFilter[]).map((type) => (
              <button
                key={type}
                type="button"
                className={`segmented-option ${filters.type === type ? 'is-active' : ''}`}
                onClick={() => updateField('type', type)}
              >
                {TYPE_FILTER_LABELS[type]}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
};
