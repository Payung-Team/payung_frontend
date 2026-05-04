import { useState, useCallback } from 'react';
import type { ToastType } from '../components/ui/Toast';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'success', duration = 3000) => {
    const id = Date.now().toString();
    const toast: ToastMessage = { id, message, type, duration };
    setToasts((prev) => [...prev, toast]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback((message: string, duration?: number) => addToast(message, 'success', duration), [addToast]);
  const error = useCallback((message: string, duration?: number) => addToast(message, 'error', duration), [addToast]);
  const info = useCallback((message: string, duration?: number) => addToast(message, 'info', duration), [addToast]);
  const warning = useCallback((message: string, duration?: number) => addToast(message, 'warning', duration), [addToast]);

  return { toasts, addToast, removeToast, success, error, info, warning };
}
