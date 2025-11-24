import React from 'react';
import { ActiveTimer, Task, Subtask } from '../types';
import { Square, Play, Coffee } from 'lucide-react';

interface FocusModeProps {
  activeTimer: ActiveTimer | null;
  tasks: Task[];
  subtasks: Subtask[];
  onStopTimer: () => void;
  onStartTimer: (taskId: string, subtaskId?: string) => void;
}

const FocusMode: React.FC<FocusModeProps> = ({ activeTimer, tasks, subtasks, onStopTimer, onStartTimer }) => {
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    if (!activeTimer) {
        setElapsed(0);
        return;
    }
    const update = () => {
        const now = Date.now();
        setElapsed(Math.floor((now - activeTimer.startTime) / 1000));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [activeTimer]);

  const formatTime = (seconds: number) => {
    const absSeconds = Math.abs(seconds);
    const h = Math.floor(absSeconds / 3600);
    const m = Math.floor((absSeconds % 3600) / 60);
    const s = absSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentTask = activeTimer ? tasks.find(t => t.id === activeTimer.taskId) : null;
  const currentSubtask = activeTimer && activeTimer.subtaskId ? subtasks.find(s => s.id === activeTimer.subtaskId) : null;

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-950 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"></div>
         <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="z-10 text-center max-w-2xl w-full">
         {!activeTimer ? (
             <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="inline-flex items-center justify-center p-4 bg-slate-900 rounded-full border border-slate-800 text-slate-500 mb-4">
                    <Coffee size={40} />
                </div>
                <h2 className="text-4xl font-bold text-slate-300">Ready to Focus?</h2>
                <p className="text-slate-500 text-lg">Select a task from the board or timeline to start your session.</p>
             </div>
         ) : (
             <div className="space-y-12 animate-in fade-in zoom-in duration-500">
                 <div>
                    <span className="inline-block px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-sm font-medium tracking-wide uppercase mb-6 border border-indigo-500/20">
                        Focus Mode Active
                    </span>
                    
                    <h1 className="text-7xl md:text-9xl font-mono font-bold text-white tracking-tight tabular-nums drop-shadow-2xl">
                        {formatTime(elapsed)}
                    </h1>
                 </div>

                 <div className="space-y-4">
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-200 leading-snug">
                        {currentTask?.title}
                    </h2>
                    {currentSubtask && (
                        <p className="text-xl text-indigo-400 font-medium flex items-center justify-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                            {currentSubtask.title}
                        </p>
                    )}
                 </div>

                 <div className="pt-8">
                     <button
                        onClick={onStopTimer}
                        className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold text-lg transition-all hover:scale-105 shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)]"
                     >
                        <Square fill="currentColor" size={24} />
                        Stop Session
                     </button>
                     <p className="mt-6 text-slate-500 text-sm">Notes can be added when you stop the timer.</p>
                 </div>
             </div>
         )}
      </div>
    </div>
  );
};

export default FocusMode;