import { useState, useCallback } from 'react';
import type { ToastType, ToastVariant } from '../components/ui/Toast';

export interface ToastMessage {
  id: string;
  message: React.ReactNode;
  type: ToastType;
  duration?: number;
  variant?: ToastVariant;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: React.ReactNode, type: ToastType = 'success', duration = 3000, variant?: ToastVariant) => {
    const id = Date.now().toString();
    const toast: ToastMessage = { id, message, type, duration, variant };
    setToasts((prev) => [...prev, toast]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback((message: React.ReactNode, duration?: number, variant?: ToastVariant) => addToast(message, 'success', duration, variant), [addToast]);
  const error = useCallback((message: React.ReactNode, duration?: number, variant?: ToastVariant) => addToast(message, 'error', duration, variant), [addToast]);
  const info = useCallback((message: React.ReactNode, duration?: number, variant?: ToastVariant) => addToast(message, 'info', duration, variant), [addToast]);
  const warning = useCallback((message: React.ReactNode, duration?: number, variant?: ToastVariant) => addToast(message, 'warning', duration, variant), [addToast]);

  return { toasts, addToast, removeToast, success, error, info, warning };
}
