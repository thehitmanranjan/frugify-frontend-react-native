import React, { createContext, useContext, useState, ReactNode } from 'react';
import NotificationToast from '../components/NotificationToast';
import PermissionModal from '../components/PermissionModal';

interface ToastData {
  id: string;
  title: string;
  message: string;
  duration?: number;
}

interface PermissionModalData {
  title: string;
  message: string;
  onAllow: () => void;
  onCancel: () => void;
  onDontAskAgain: () => void;
}

interface ToastContextType {
  showToast: (title: string, message: string, duration?: number) => void;
  showPermissionModal: (data: PermissionModalData) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Global references for showing toasts and modals from outside React components
let globalShowToast: ((title: string, message: string, duration?: number) => void) | null = null;
let globalShowPermissionModal: ((data: PermissionModalData) => void) | null = null;

export const showGlobalToast = (title: string, message: string, duration?: number) => {
  if (globalShowToast) {
    globalShowToast(title, message, duration);
  }
};

export const showGlobalPermissionModal = (data: PermissionModalData) => {
  if (globalShowPermissionModal) {
    globalShowPermissionModal(data);
  }
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<ToastData | null>(null);
  const [permissionModal, setPermissionModal] = useState<PermissionModalData | null>(null);

  const showToast = (title: string, message: string, duration = 10000) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToast({ id, title, message, duration });
  };

  const showPermissionModal = (data: PermissionModalData) => {
    setPermissionModal(data);
  };

  // Set global references
  React.useEffect(() => {
    globalShowToast = showToast;
    globalShowPermissionModal = showPermissionModal;
    return () => {
      globalShowToast = null;
      globalShowPermissionModal = null;
    };
  }, []);

  const dismissToast = () => {
    setToast(null);
  };

  const dismissPermissionModal = () => {
    setPermissionModal(null);
  };

  return (
    <ToastContext.Provider value={{ showToast, showPermissionModal }}>
      {children}
      <NotificationToast
        visible={!!toast}
        title={toast?.title || ''}
        message={toast?.message || ''}
        onDismiss={dismissToast}
        duration={toast?.duration}
      />
      <PermissionModal
        visible={!!permissionModal}
        title={permissionModal?.title || ''}
        message={permissionModal?.message || ''}
        onAllow={() => {
          permissionModal?.onAllow();
          dismissPermissionModal();
        }}
        onCancel={() => {
          permissionModal?.onCancel();
          dismissPermissionModal();
        }}
        onDontAskAgain={() => {
          permissionModal?.onDontAskAgain();
          dismissPermissionModal();
        }}
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
