import React, { useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onRemove={() => onRemove(toast.id)} />
      ))}
    </div>
  );
};

const Toast: React.FC<ToastMessage & { onRemove: () => void }> = ({ type, message, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onRemove]);

  const getStyles = () => {
    switch (type) {
      case 'success': return 'bg-slate-800 border-l-4 border-emerald-500 text-slate-100';
      case 'error': return 'bg-slate-800 border-l-4 border-red-500 text-slate-100';
      default: return 'bg-slate-800 border-l-4 border-blue-500 text-slate-100';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle2 className="text-emerald-500" size={20} />;
      case 'error': return <AlertCircle className="text-red-500" size={20} />;
      default: return <Info className="text-blue-500" size={20} />;
    }
  };

  return (
    <div className={`pointer-events-auto flex items-center gap-3 p-4 rounded shadow-2xl min-w-[300px] max-w-md animate-in slide-in-from-right-10 fade-in duration-300 ${getStyles()}`}>
      {getIcon()}
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button onClick={onRemove} className="text-slate-500 hover:text-white transition-colors">
        <X size={16} />
      </button>
    </div>
  );
};

export default ToastContainer;