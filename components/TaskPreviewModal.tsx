
import React from 'react';
import { Task, Subtask, Client } from '../types';
import { X, Play, Hash, Clock, CheckCircle2, Circle } from 'lucide-react';

interface TaskPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  client: Client | null;
  subtasks: Subtask[];
  onStartTimer: (taskId: string, subtaskId?: string) => void;
}

const TaskPreviewModal: React.FC<TaskPreviewModalProps> = ({ 
  isOpen, 
  onClose, 
  task, 
  client,
  subtasks,
  onStartTimer 
}) => {
  if (!isOpen || !task) return null;

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-700 bg-slate-900/50 flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
               {client && (
                 <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded text-slate-900" style={{ backgroundColor: client.color }}>
                   {client.name}
                 </span>
               )}
               {task.ticketNumber && (
                 <span className="flex items-center gap-1 text-xs font-mono text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded">
                   <Hash size={10} /> {task.ticketNumber}
                 </span>
               )}
            </div>
            <h3 className="text-xl font-bold text-white">{task.title}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6">
          {task.description && (
            <div className="bg-slate-700/20 p-3 rounded-lg border border-slate-700/50">
              <p className="text-sm text-slate-300">{task.description}</p>
            </div>
          )}

          <div>
             <div className="flex items-center justify-between mb-3">
               <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Subtasks & Timer</h4>
               <span className="text-xs text-slate-500 font-mono">Total: {formatDuration(task.totalTime + subtasks.reduce((a,b) => a + b.totalTime, 0))}</span>
             </div>
             
             <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {/* Main Task Timer */}
                <div className="flex items-center justify-between bg-slate-700/30 p-3 rounded-lg group hover:bg-slate-700/50 transition-colors">
                   <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                      <span className="text-slate-200 font-medium">Main Task (General)</span>
                   </div>
                   <button 
                     onClick={() => { onStartTimer(task.id); onClose(); }}
                     className="p-2 bg-slate-700 hover:bg-indigo-600 text-white rounded-full transition-colors flex items-center gap-2 text-xs font-medium"
                   >
                     <Play size={14} fill="currentColor" /> Start
                   </button>
                </div>

                {/* Subtasks */}
                {subtasks.map(sub => (
                   <div key={sub.id} className="flex items-center justify-between bg-slate-800 p-2 rounded-lg border border-slate-700/50">
                      <div className="flex items-center gap-3">
                         {sub.isCompleted ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Circle size={16} className="text-slate-600" />}
                         <span className={`text-sm ${sub.isCompleted ? 'text-slate-500 line-through' : 'text-slate-300'}`}>{sub.title}</span>
                      </div>
                      <div className="flex items-center gap-3">
                         <span className="text-xs text-slate-500 font-mono">{formatDuration(sub.totalTime)}</span>
                         <button 
                           onClick={() => { onStartTimer(task.id, sub.id); onClose(); }}
                           className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 rounded transition-colors"
                         >
                           <Play size={14} fill="currentColor" />
                         </button>
                      </div>
                   </div>
                ))}

                {subtasks.length === 0 && (
                   <p className="text-center text-xs text-slate-500 py-2 italic">No subtasks defined.</p>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskPreviewModal;
