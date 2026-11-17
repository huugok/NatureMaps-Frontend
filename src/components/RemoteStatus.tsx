import { CloudOff } from 'lucide-react';
import { useApp } from '../context/useApp';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';

/** Estado «cargando» de una pantalla que espera datos del backend. */
export function RemoteLoading({ message }: { message: string }) {
  return (
    <p role="status" className="py-10 text-center text-small text-muted">
      {message}
    </p>
  );
}

/** Estado de error con reintento: sin datos de reserva, el fallo se dice. */
export function RemoteError({ message, description, onRetry }: { message: string; description?: string; onRetry: () => void }) {
  const { t } = useApp();
  return (
    <div role="alert">
      <EmptyState
        icon={CloudOff}
        title={message}
        {...(description !== undefined ? { description } : {})}
        action={<Button variant="secondary" size="sm" onClick={onRetry}>{t('common.retry')}</Button>}
      />
    </div>
  );
}
