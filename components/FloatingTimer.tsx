
import React, { useEffect, useState } from 'react';
import { ActiveTimer, Task, Subtask } from '../types';
import { Square, Clock } from 'lucide-react';

interface FloatingTimerProps {
  activeTimer: ActiveTimer | null;
  tasks: Task[];
  subtasks: Subtask[];
  stopTimer: () => void;
}

const FloatingTimer: React.FC<FloatingTimerProps> = ({ activeTimer, tasks, subtasks, stopTimer }) => {
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

  const currentTask = tasks.find(t => t.id === activeTimer.taskId);
  const currentSubtask = activeTimer.subtaskId 
    ? subtasks.find(s => s.id === activeTimer.subtaskId) 
    : null;

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
              {currentTask?.title || 'Unknown Task'}
            </h3>
            {currentSubtask && (
              <p className="text-slate-400 text-xs md:text-sm truncate max-w-[150px] flex items-center gap-1.5">
                 <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                 {currentSubtask.title}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-6 relative z-10">
        <div className="text-3xl md:text-4xl font-mono font-bold tabular-nums tracking-tighter text-white drop-shadow-[0_0_15px_rgba(99,102,241,0.4)]">
          {isFuture ? '-' : ''}{formatTime(elapsed)}
        </div>
        <button
          onClick={stopTimer}
          className="group bg-red-500 hover:bg-red-600 text-white p-3 md:p-4 rounded-xl transition-all hover:scale-105 shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] border border-red-400/50"
          title="Stop Timer"
        >
          <Square size={20} fill="currentColor" />
        </button>
      </div>
    </div>
  );
};

export default FloatingTimer;
