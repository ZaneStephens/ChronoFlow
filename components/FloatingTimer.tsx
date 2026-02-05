import React, { useEffect, useState } from 'react';
import { ActiveTimer } from '../types';
import { Square, Clock, Trash2 } from 'lucide-react';

interface FloatingTimerProps {
  activeTimer: ActiveTimer | null;
  onStop: () => void;
  onCancel: () => void;
  taskTitle?: string;
}

const FloatingTimer: React.FC<FloatingTimerProps> = ({ activeTimer, onStop, onCancel, taskTitle }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeTimer) return;

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.floor((now - activeTimer.startTime) / 1000);
      setElapsed(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [activeTimer]);

  if (!activeTimer) return null;

  const formatTime = (seconds: number) => {
    const absSeconds = Math.abs(seconds);
    const h = Math.floor(absSeconds / 3600);
    const m = Math.floor((absSeconds % 3600) / 60);
    const s = absSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isFuture = elapsed < 0;

  return (
    <div id="floating-timer" className="fixed bottom-0 left-0 md:left-64 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-indigo-500/30 p-4 z-50 flex items-center justify-between shadow-[0_-8px_30px_rgba(0,0,0,0.5)] transition-all duration-500">
      
      {/* Pulsing Top Line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-pulse"></div>
      
      {/* Background Glow Spot */}
      <div className="absolute top-0 left-10 w-32 h-32 bg-indigo-500/10 blur-[50px] rounded-full pointer-events-none"></div>

      <div className="flex items-center space-x-4 relative z-10">
        <div className="relative">
             {/* Ping Effect */}
             <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20"></div>
             <div className="w-12 h-12 rounded-full flex items-center justify-center bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)] relative z-10">
               <Clock size={22} className="drop-shadow-[0_0_5px_rgba(99,102,241,0.8)]" />
             </div>
        </div>
        
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
             <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 animate-pulse">
               Tracking Active
             </p>
          </div>
          <div className="flex flex-col">
            <h3 className="text-white font-bold truncate max-w-[200px] md:max-w-md text-sm md:text-base tracking-tight shadow-black drop-shadow-md">
              {taskTitle || 'Unallocated Task'}
            </h3>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-6 relative z-10">
        <div className="text-3xl md:text-4xl font-mono font-bold tabular-nums tracking-tighter text-white drop-shadow-[0_0_15px_rgba(99,102,241,0.4)]">
          {isFuture ? '-' : ''}{formatTime(elapsed)}
        </div>
        
        <div className="flex items-center gap-2">
            <button
                onClick={onCancel}
                className="group bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 p-3 md:p-4 rounded-xl transition-all border border-slate-700 hover:border-red-400/50"
                title="Discard Timer"
            >
                <Trash2 size={20} />
            </button>
            <button
            onClick={onStop}
            className="group bg-red-500 hover:bg-red-600 text-white p-3 md:p-4 rounded-xl transition-all hover:scale-105 shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] border border-red-400/50"
            title="Stop & Save Timer"
            >
            <Square size={20} fill="currentColor" />
            </button>
        </div>
      </div>
    </div>
  );
};

export default FloatingTimer;