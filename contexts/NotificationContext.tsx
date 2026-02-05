import React, { createContext, useContext, useState, ReactNode } from 'react';
import ToastContainer, { ToastMessage, ToastType } from '../components/Toast';
import ConfirmModal, { ConfirmModalConfig } from '../components/ConfirmModal';

// IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

interface NotificationContextType {
    showToast: (message: string, type?: ToastType, onUndo?: () => void) => void;
    requestConfirm: (config: Omit<ConfirmModalConfig, 'isOpen' | 'onConfirm' | 'onCancel'> & { onConfirm: () => void; onCancel?: () => void }) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Toast State
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    // Confirm Modal State
    const [confirmConfig, setConfirmConfig] = useState<ConfirmModalConfig>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        onCancel: () => { },
    });

    const showToast = (message: string, type: ToastType = 'info', onUndo?: () => void) => {
        const id = generateId();
        setToasts(prev => [...prev, { id, message, type, onUndo }]);
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const requestConfirm = (config: Omit<ConfirmModalConfig, 'isOpen' | 'onConfirm' | 'onCancel'> & { onConfirm: () => void; onCancel?: () => void }) => {
        setConfirmConfig({
            ...config,
            isOpen: true,
            onConfirm: () => {
                config.onConfirm();
                closeConfirm();
            },
            onCancel: () => {
                if (config.onCancel) config.onCancel();
                closeConfirm();
            }
        });
    };

    const closeConfirm = () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
    };

    return (
        <NotificationContext.Provider value={{ showToast, requestConfirm }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
            <ConfirmModal
                {...confirmConfig}
                onCancel={() => {
                    confirmConfig.onCancel();
                    closeConfirm();
                }}
            />
        </NotificationContext.Provider>
    );
};
