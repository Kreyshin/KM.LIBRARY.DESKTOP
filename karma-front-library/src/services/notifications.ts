import { toast } from 'vue-sonner';
import { reactive } from 'vue';

export function notifySuccess(message: string, description?: string) {
  return toast.success(message, { description, class: 'karma-toast karma-toast--success' });
}

export function notifyError(message: string, description?: string) {
  return toast.error(message, { description, class: 'karma-toast karma-toast--error' });
}

export function notifyInfo(message: string, description?: string) {
  return toast.info(message, { description, class: 'karma-toast karma-toast--info' });
}

export function confirmAction(options: {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    confirmationState.resolve?.(false);
    Object.assign(confirmationState, {
      open: true,
      title: options.title,
      description: options.description || '',
      confirmLabel: options.confirmLabel || 'Confirmar',
      cancelLabel: options.cancelLabel || 'Cancelar',
      danger: options.danger || false,
      resolve,
    });
  });
}

export const confirmationState = reactive<{
  open: boolean; title: string; description: string; confirmLabel: string; cancelLabel: string; danger: boolean;
  resolve: ((accepted: boolean) => void) | null;
}>({ open: false, title: '', description: '', confirmLabel: 'Confirmar', cancelLabel: 'Cancelar', danger: false, resolve: null });

export function resolveConfirmation(accepted: boolean) {
  if (!confirmationState.open) return;
  const resolve = confirmationState.resolve;
  confirmationState.open = false;
  confirmationState.resolve = null;
  resolve?.(accepted);
}
