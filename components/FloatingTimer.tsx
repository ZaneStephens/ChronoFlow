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
    <div id="floating-timer" className="fixed bottom-0 left-0 md:left-64 right-0 bg-slate-800/90 backdrop-blur-md border-t border-indigo-500/30 p-4 z-50 flex items-center justify-between shadow-2xl shadow-indigo-900/50">
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-500/20 text-indigo-400 animate-pulse">
          <Clock size={20} />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-indigo-300">
            Now Tracking
          </p>
          <div className="flex flex-col md:flex-row md:items-center md:space-x-2">
            <h3 className="text-slate-100 font-semibold truncate max-w-[200px] md:max-w-md">
              {currentTask?.title || 'Unknown Task'}
            </h3>
            {currentSubtask && (
              <>
                <span className="hidden md:inline text-slate-500">/</span>
                <span className="text-slate-400 text-sm truncate max-w-[150px]">{currentSubtask.title}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-6">
        <div className="text-3xl font-mono font-bold tabular-nums tracking-tight text-white">
          {isFuture ? '-' : ''}{formatTime(elapsed)}
        </div>
        <button
          onClick={stopTimer}
          className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-full transition-all hover:scale-105 shadow-lg shadow-red-900/20"
        >
          <Square size={20} fill="currentColor" />
        </button>
      </div>
    </div>
  );
};

export default FloatingTimer;