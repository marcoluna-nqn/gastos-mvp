import type { MovementRecord } from '../../types/movement';
import { formatArs } from '../../utils/currency';
import { formatDisplayDate } from '../../utils/date';
import { EmptyState } from '../common/EmptyState';

interface MovementHistoryProps {
  movements: MovementRecord[];
  search: string;
  onSearchChange: (value: string) => void;
  onEdit: (movement: MovementRecord) => void;
  onDeleteRequest: (movement: MovementRecord) => void;
  onDuplicate: (movement: MovementRecord) => Promise<number | null>;
}

export const MovementHistory = ({
  movements,
  search,
  onSearchChange,
  onEdit,
  onDeleteRequest,
  onDuplicate,
}: MovementHistoryProps) => {
  return (
    <section className="card">
      <header className="section-header history-header">
        <h2>Lista</h2>
        <input
          className="field search-field"
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar categoria, nota o fecha"
          aria-label="Buscar movimientos"
        />
      </header>

      {movements.length === 0 ? (
        <EmptyState title="No hay movimientos" description="Cuando cargues ingresos o gastos, apareceran aca." />
      ) : (
        <ul className="movement-list">
          {movements.map((movement) => (
            <li key={movement.id} className="movement-item">
              <div className="movement-top">
                <div>
                  <p className="movement-category">{movement.category}</p>
                  <p className="movement-meta">
                    {formatDisplayDate(movement.date)} • {movement.paymentMethod}
                  </p>
                </div>
                <strong className={`movement-amount ${movement.type}`}>
                  {movement.type === 'gasto' ? '-' : '+'}
                  {formatArs(movement.amountCents)}
                </strong>
              </div>

              {movement.note ? <p className="movement-note">{movement.note}</p> : null}

              <div className="movement-actions">
                <span className={`movement-badge ${movement.type}`}>{movement.type}</span>
                <div className="actions-row compact">
                  <button type="button" className="button button-secondary" onClick={() => onEdit(movement)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => {
                      void onDuplicate(movement);
                    }}
                  >
                    Duplicar
                  </button>
                  <button
                    type="button"
                    className="button button-danger ghost"
                    onClick={() => onDeleteRequest(movement)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
