import React, { createContext, useContext, useState, ReactNode } from 'react';
import NotificationToast from '../components/NotificationToast';

interface ToastData {
  id: string;
  title: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (title: string, message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Global reference for showing toasts from outside React components
let globalShowToast: ((title: string, message: string, duration?: number) => void) | null = null;

export const showGlobalToast = (title: string, message: string, duration?: number) => {
  if (globalShowToast) {
    globalShowToast(title, message, duration);
  }
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = (title: string, message: string, duration = 10000) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToast({ id, title, message, duration });
  };

  // Set global reference
  React.useEffect(() => {
    globalShowToast = showToast;
    return () => {
      globalShowToast = null;
    };
  }, []);

  const dismissToast = () => {
    setToast(null);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <NotificationToast
        visible={!!toast}
        title={toast?.title || ''}
        message={toast?.message || ''}
        onDismiss={dismissToast}
        duration={toast?.duration}
      />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
