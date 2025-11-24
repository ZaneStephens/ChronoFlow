
import React, { useState, useEffect } from 'react';
import { Task, Client } from '../types';
import { X, CalendarPlus, Zap, CheckSquare } from 'lucide-react';

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { type: 'task' | 'quick', taskId?: string, clientId?: string, quickTitle?: string, duration: number, startTime: number }) => void;
  tasks: Task[];
  clients: Client[];
  initialTime?: number;
}

const PlanModal: React.FC<PlanModalProps> = ({ isOpen, onClose, onSave, tasks, clients, initialTime }) => {
  const [type, setType] = useState<'task' | 'quick'>('task');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickClientId, setQuickClientId] = useState('');
  const [duration, setDuration] = useState(30);
  const [filterClient, setFilterClient] = useState('all');
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    if (isOpen) {
      setType('task');
      // Don't reset selectedTaskId here immediately, let the filter effect handle it to avoid race
      setQuickTitle('');
      setQuickClientId('');
      setDuration(30);
      setFilterClient('all');
      
      if (initialTime) {
        // Create HH:mm string for input
        const d = new Date(initialTime);
        const h = d.getHours().toString().padStart(2, '0');
        const m = d.getMinutes().toString().padStart(2, '0');
        setTimeStr(`${h}:${m}`);
      } else {
        const now = new Date();
        const h = now.getHours().toString().padStart(2, '0');
        const m = now.getMinutes().toString().padStart(2, '0');
        setTimeStr(`${h}:${m}`);
      }
    }
  }, [isOpen, initialTime]);

  const filteredTasks = filterClient === 'all' 
    ? tasks 
    : tasks.filter(t => t.clientId === filterClient);

  // Auto-select the first task if none is selected or if current selection is invalid
  useEffect(() => {
    if (type === 'task' && isOpen) {
      const isValid = filteredTasks.some(t => t.id === selectedTaskId);
      if (!selectedTaskId || !isValid) {
        if (filteredTasks.length > 0) {
          setSelectedTaskId(filteredTasks[0].id);
        } else {
          setSelectedTaskId('');
        }
      }
    }
  }, [filteredTasks, type, isOpen, selectedTaskId]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (type === 'task' && !selectedTaskId) return;
    if (type === 'quick' && !quickTitle) return;
    if (!timeStr) return;

    // Convert timeStr back to timestamp using the initial date
    const [h, m] = timeStr.split(':').map(Number);
    const baseDate = initialTime ? new Date(initialTime) : new Date();
    baseDate.setHours(h, m, 0, 0);

    onSave({
      type,
      taskId: type === 'task' ? selectedTaskId : undefined,
      clientId: type === 'quick' && quickClientId ? quickClientId : undefined,
      quickTitle: type === 'quick' ? quickTitle : undefined,
      duration,
      startTime: baseDate.getTime()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CalendarPlus className="text-indigo-400" size={20} />
              Plan Activity
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Toggle Type */}
          <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setType('task')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                type === 'task' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckSquare size={16} /> Existing Task
            </button>
            <button
              onClick={() => setType('quick')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                type === 'quick' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap size={16} /> Quick Entry
            </button>
          </div>
          
          {/* Start Time Input */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Start Time</label>
            <input 
                type="time" 
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none w-full"
            />
          </div>

          {type === 'task' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Filter by Client</label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  <button
                     onClick={() => setFilterClient('all')}
                     className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border ${filterClient === 'all' ? 'bg-slate-700 border-slate-500 text-white' : 'border-slate-700 text-slate-500'}`}
                  >
                    All
                  </button>
                  {clients.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setFilterClient(c.id)}
                      className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border transition-colors ${filterClient === c.id ? 'text-white border-current' : 'border-slate-700 text-slate-500'}`}
                      style={{ borderColor: filterClient === c.id ? c.color : undefined, backgroundColor: filterClient === c.id ? `${c.color}20` : undefined }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Select Task</label>
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  size={4}
                >
                  {filteredTasks.map(t => (
                    <option key={t.id} value={t.id} className="py-1 px-2 rounded hover:bg-slate-800">
                      {t.title}
                    </option>
                  ))}
                  {filteredTasks.length === 0 && <option disabled className="p-2 text-slate-500">No tasks found for this client</option>}
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Title / Note</label>
                <input
                  type="text"
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  placeholder="e.g. Client Meeting, Lunch, Admin"
                  autoFocus
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Client (Optional)</label>
                <select
                  value={quickClientId}
                  onChange={(e) => setQuickClientId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">-- No Client / Internal --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
             <label className="block text-sm font-medium text-slate-400 mb-1">Duration</label>
             <div className="flex items-center gap-4">
               <input 
                 type="range" 
                 min="15" 
                 max="240" 
                 step="15" 
                 value={duration} 
                 onChange={(e) => setDuration(parseInt(e.target.value))}
                 className="flex-1 accent-indigo-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
               />
               <span className="font-mono text-white min-w-[60px] text-right">{duration}m</span>
             </div>
          </div>
        </div>

        <div className="p-4 bg-slate-900/50 border-t border-slate-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={(type === 'task' && !selectedTaskId) || (type === 'quick' && !quickTitle)}
            className={`px-6 py-2 text-white font-medium rounded-lg shadow-lg flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              type === 'task' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-900/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20'
            }`}
          >
            <CalendarPlus size={18} />
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanModal;
