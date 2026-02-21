import type { MovementRecord } from '../../types/movement';
import { formatArs } from '../../utils/currency';
import { formatDisplayDate, todayIsoDate } from '../../utils/date';
import { getDueStatusLabel, isReminderMovement, resolveDueStatus } from '../../utils/reminders';
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
  const currentDate = todayIsoDate();

  return (
    <section className="card">
      <header className="section-header history-header">
        <h2>Lista</h2>
        <input
          className="field search-field"
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar movimientos"
          aria-label="Buscar movimientos"
        />
      </header>

      {movements.length === 0 ? (
        <EmptyState title="No hay movimientos" description="Carga tu primer movimiento para empezar." />
      ) : (
        <ul className="movement-list">
          {movements.map((movement) => {
            const dueStatus =
              movement.dueDate && isReminderMovement(movement)
                ? resolveDueStatus(movement.dueDate, currentDate)
                : null;

            return (
              <li key={movement.id} className="movement-item">
                <div className="movement-top">
                  <div>
                    <p className="movement-category">{movement.category}</p>
                    <p className="movement-meta">
                      {formatDisplayDate(movement.date)} - {movement.paymentMethod}
                    </p>
                    {movement.dueDate ? (
                      <p className="movement-meta">
                        Vencimiento: {formatDisplayDate(movement.dueDate)}
                      </p>
                    ) : null}
                  </div>
                  <strong className={`movement-amount ${movement.type}`}>
                    {movement.type === 'gasto' ? '-' : '+'}
                    {formatArs(movement.amountCents)}
                  </strong>
                </div>

                {movement.note ? <p className="movement-note">{movement.note}</p> : null}

                <div className="movement-actions">
                  <div className="movement-badges-row">
                    <span className={`movement-badge ${movement.type}`}>{movement.type}</span>
                    {dueStatus ? (
                      <span className={`movement-badge due-status due-status-${dueStatus}`}>
                        {getDueStatusLabel(dueStatus)}
                      </span>
                    ) : null}
                  </div>
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
            );
          })}
        </ul>
      )}
    </section>
  );
};
