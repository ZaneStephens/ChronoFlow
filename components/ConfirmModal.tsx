import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export interface ConfirmModalConfig {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning';
    onConfirm: () => void;
    onCancel: () => void;
}

interface ConfirmModalProps extends ConfirmModalConfig { }

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'danger',
    onConfirm,
    onCancel
}) => {
    const confirmButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (isOpen) {
            // Focus the confirm button when modal opens
            confirmButtonRef.current?.focus();

            // Handle escape key
            const handleEscape = (e: KeyboardEvent) => {
                if (e.key === 'Escape') onCancel();
            };
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    const isDanger = variant === 'danger';

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onCancel}
            />

            {/* Modal */}
            <div className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center gap-3 p-5 border-b border-slate-700">
                    <div className={`p-2 rounded-lg ${isDanger ? 'bg-red-500/20' : 'bg-amber-500/20'}`}>
                        <AlertTriangle className={isDanger ? 'text-red-400' : 'text-amber-400'} size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-white flex-1">{title}</h2>
                    <button
                        onClick={onCancel}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5">
                    <p className="text-slate-300 leading-relaxed">{message}</p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 p-5 border-t border-slate-700 bg-slate-900/50 rounded-b-xl">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg font-medium transition-colors"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        ref={confirmButtonRef}
                        onClick={onConfirm}
                        className={`px-4 py-2 text-white font-bold rounded-lg shadow-lg transition-all active:scale-95 ${isDanger
                                ? 'bg-red-600 hover:bg-red-700 shadow-red-900/20'
                                : 'bg-amber-600 hover:bg-amber-700 shadow-amber-900/20'
                            }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
