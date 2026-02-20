import { useToast } from '../../hooks/useToast';

const TOAST_TONE_LABEL: Record<'success' | 'error' | 'info', string> = {
  success: 'Exito',
  error: 'Error',
  info: 'Info',
};

export const ToastViewport = () => {
  const { toasts, dismissToast } = useToast();

  return (
    <div className="toast-viewport" aria-live="polite" aria-label="Notificaciones">
      {toasts.map((toast) => (
        <article key={toast.id} className={`toast toast-${toast.tone}`} role="status">
          <header className="toast-header">
            <strong>{TOAST_TONE_LABEL[toast.tone]}</strong>
            <button
              type="button"
              className="text-button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Cerrar notificación"
            >
              Cerrar
            </button>
          </header>
          <p className="toast-title">{toast.title}</p>
          {toast.description ? <p className="toast-description">{toast.description}</p> : null}
        </article>
      ))}
    </div>
  );
};
