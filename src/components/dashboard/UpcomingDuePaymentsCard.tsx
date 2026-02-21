import { useEffect, useMemo, useState } from 'react';
import type { MovementRecord } from '../../types/movement';
import { formatArs } from '../../utils/currency';
import { formatDisplayDate, todayIsoDate } from '../../utils/date';
import { buildUpcomingReminderItems, getDueStatusLabel } from '../../utils/reminders';
import { EmptyState } from '../common/EmptyState';

interface UpcomingDuePaymentsCardProps {
  movements: MovementRecord[];
}

const MAX_REMINDERS = 6;
const TODAY_REFRESH_INTERVAL_MS = 60_000;

export const UpcomingDuePaymentsCard = ({ movements }: UpcomingDuePaymentsCardProps) => {
  const [todayKey, setTodayKey] = useState(() => todayIsoDate());

  useEffect(() => {
    const refreshTodayKey = () => {
      const next = todayIsoDate();
      setTodayKey((current) => (current === next ? current : next));
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshTodayKey();
      }
    };

    const intervalId = window.setInterval(refreshTodayKey, TODAY_REFRESH_INTERVAL_MS);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const reminders = useMemo(
    () => buildUpcomingReminderItems(movements, todayKey),
    [movements, todayKey],
  );

  return (
    <article className="card due-payments-card">
      <header className="section-header">
        <h2>Proximos vencimientos</h2>
      </header>

      {reminders.length === 0 ? (
        <EmptyState
          title="Sin alertas por ahora"
          description='Activa "Recordarme este pago" y agrega vencimiento en tus movimientos.'
        />
      ) : (
        <ul className="due-list">
          {reminders.slice(0, MAX_REMINDERS).map((entry) => (
            <li key={`${entry.movement.id ?? entry.movement.createdAt}-${entry.dueDate}`} className="due-item">
              <div className="due-item-top">
                <p className="movement-category">{entry.movement.category}</p>
                <span className={`due-status due-status-${entry.status}`}>{getDueStatusLabel(entry.status)}</span>
              </div>
              <p className="movement-meta">
                Vence: {formatDisplayDate(entry.dueDate)} - {entry.movement.paymentMethod}
              </p>
              <strong className={`movement-amount ${entry.movement.type}`}>
                {entry.movement.type === 'gasto' ? '-' : '+'}
                {formatArs(entry.movement.amountCents)}
              </strong>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
};
