
import React, { useState, useEffect } from 'react';
import { TimerSession, Task, Subtask } from '../types';
import { X, Save, Clock, Trash2, AlertCircle } from 'lucide-react';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sessionId: string | null, updates: Partial<TimerSession>) => void;
  onDelete?: (sessionId: string) => void;
  session?: TimerSession | null; // If null, we might be stopping a timer (creating a new session effectively)
  initialData?: Partial<TimerSession>; // For the "Stop Timer" flow where we have start/end but no ID yet
  mode: 'edit' | 'stop';
  tasks: Task[];
}

const SessionModal: React.FC<SessionModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  onDelete,
  session, 
  initialData, 
  mode,
  tasks
}) => {
  const [notes, setNotes] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowDeleteConfirm(false);
      if (mode === 'stop' && initialData) {
        setNotes('');
        // We don't edit times during stop flow usually, but we could
      } else if (mode === 'edit' && session) {
        setNotes(session.notes || '');
        setStartTime(new Date(session.startTime).toTimeString().slice(0, 5));
        setEndTime(session.endTime ? new Date(session.endTime).toTimeString().slice(0, 5) : '');
      }
    }
  }, [isOpen, session, initialData, mode]);

  if (!isOpen) return null;

  const handleSave = () => {
    const updates: Partial<TimerSession> = { notes };
    
    if (mode === 'edit' && session) {
      // Parse times
      const date = new Date(session.startTime);
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();

      if (startTime) {
        const [h, m] = startTime.split(':').map(Number);
        const newStart = new Date(year, month, day, h, m).getTime();
        updates.startTime = newStart;
      }

      if (endTime) {
        const [h, m] = endTime.split(':').map(Number);
        const newEnd = new Date(year, month, day, h, m).getTime();
        updates.endTime = newEnd;
      }
    }

    onSave(session?.id || null, updates);
    onClose();
  };

  const handleDelete = () => {
    if (session && onDelete) {
      onDelete(session.id);
      onClose();
    }
  };

  const activeTaskId = session?.taskId || initialData?.taskId;
  const taskTitle = tasks.find(t => t.id === activeTaskId)?.title || 'Unknown Task';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            {mode === 'stop' ? <Clock className="text-indigo-400" /> : <Clock className="text-emerald-400" />}
            {mode === 'stop' ? 'Save Session Notes' : 'Edit Session'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="bg-slate-700/30 p-3 rounded-lg border border-slate-700">
             <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Task</p>
             <p className="text-white font-medium truncate">{taskTitle}</p>
          </div>

          {mode === 'edit' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              {mode === 'stop' ? 'What did you work on?' : 'Description / Notes'}
            </label>
            <textarea
              autoFocus={mode === 'stop'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Debugging connection issue..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none"
            />
          </div>
        </div>

        <div className="p-4 bg-slate-900/50 border-t border-slate-700 flex justify-between gap-3">
          <div>
            {mode === 'edit' && onDelete && (
              !showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Trash2 size={18} />
                  <span className="text-sm">Delete</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                   <span className="text-xs text-slate-400">Sure?</span>
                   <button 
                     onClick={handleDelete}
                     className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors"
                   >
                     Yes, Delete
                   </button>
                   <button 
                     onClick={() => setShowDeleteConfirm(false)}
                     className="p-1.5 text-slate-400 hover:text-white"
                   >
                     <X size={14} />
                   </button>
                </div>
              )
            )}
          </div>
          
          <div className="flex gap-3">
            <button
                onClick={onClose}
                className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
                Cancel
            </button>
            <button
                onClick={handleSave}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-lg shadow-indigo-900/20 flex items-center gap-2 transition-transform active:scale-95"
            >
                <Save size={18} />
                {mode === 'stop' ? 'Stop & Save' : 'Update Session'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionModal;
