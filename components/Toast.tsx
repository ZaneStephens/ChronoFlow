import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Info, Undo2 } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  onUndo?: () => void;
  duration?: number;
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

const Toast: React.FC<ToastMessage & { onRemove: () => void }> = ({ type, message, onRemove, onUndo, duration }) => {
  const [progress, setProgress] = useState(100);
  const totalDuration = duration || (onUndo ? 8000 : 5000);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / totalDuration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onRemove();
      }
    }, 50);
    return () => clearInterval(interval);
  }, [onRemove, totalDuration]);

  const handleUndo = () => {
    if (onUndo) onUndo();
    onRemove();
  };

  const getStyles = () => {
    switch (type) {
      case 'success': return 'bg-slate-800 border-l-4 border-emerald-500 text-slate-100';
      case 'error': return 'bg-slate-800 border-l-4 border-red-500 text-slate-100';
      case 'warning': return 'bg-slate-800 border-l-4 border-amber-500 text-slate-100';
      default: return 'bg-slate-800 border-l-4 border-blue-500 text-slate-100';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />;
      case 'error': return <AlertCircle className="text-red-500 shrink-0" size={20} />;
      case 'warning': return <AlertCircle className="text-amber-500 shrink-0" size={20} />;
      default: return <Info className="text-blue-500 shrink-0" size={20} />;
    }
  };

  const getProgressColor = () => {
    switch (type) {
      case 'success': return 'bg-emerald-500';
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-amber-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className={`pointer-events-auto flex flex-col rounded shadow-2xl min-w-[300px] max-w-md animate-in slide-in-from-right-10 fade-in duration-300 overflow-hidden ${getStyles()}`}>
      <div className="flex items-center gap-3 p-4">
        {getIcon()}
        <p className="flex-1 text-sm font-medium">{message}</p>
        {onUndo && (
          <button
            onClick={handleUndo}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-md text-xs font-bold transition-colors shrink-0"
          >
            <Undo2 size={14} /> Undo
          </button>
        )}
        <button onClick={onRemove} className="text-slate-500 hover:text-white transition-colors shrink-0">
          <X size={16} />
        </button>
      </div>
      <div className="h-0.5 w-full bg-slate-700/50">
        <div
          className={`h-full ${getProgressColor()} transition-[width] duration-100 ease-linear opacity-40`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default ToastContainer;