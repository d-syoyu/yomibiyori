/**
 * Toast Store using Zustand
 * Toast表示の状態管理
 */

import { create } from 'zustand';
import type { ToastType } from '../components/Toast';

export interface ToastConfig {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastState {
  toasts: ToastConfig[];
  showToast: (config: Omit<ToastConfig, 'id'>) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
}

let toastIdCounter = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  showToast: (config) => {
    const id = `toast-${++toastIdCounter}`;
    const toast: ToastConfig = { id, ...config };

    set((state) => ({
      toasts: [...state.toasts, toast],
    }));

    // Auto-dismiss after duration
    const duration = config.duration || 4000;
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration + 300); // Add extra time for dismiss animation
  },

  showSuccess: (message, title) => {
    useToastStore.getState().showToast({
      type: 'success',
      title: title || '成功',
      message,
    });
  },

  showError: (message, title) => {
    useToastStore.getState().showToast({
      type: 'error',
      title: title || 'エラー',
      message,
    });
  },

  showWarning: (message, title) => {
    useToastStore.getState().showToast({
      type: 'warning',
      title: title || '警告',
      message,
    });
  },

  showInfo: (message, title) => {
    useToastStore.getState().showToast({
      type: 'info',
      title: title || '情報',
      message,
    });
  },

  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },

  clearAllToasts: () => {
    set({ toasts: [] });
  },
}));

export default useToastStore;
