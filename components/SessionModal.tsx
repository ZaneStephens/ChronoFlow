import React, { useState, useEffect, useRef } from 'react';
import { TimerSession, Task, Subtask, Client, Project } from '../types';
import { X, Save, Clock, Trash2, AlertCircle, CheckSquare, Zap, FolderKanban, Bold, Italic, List } from 'lucide-react';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sessionId: string | null, updates: Partial<TimerSession>) => void;
  onDelete?: (sessionId: string) => void;
  session?: TimerSession | null; 
  initialData?: Partial<TimerSession>; 
  mode: 'edit' | 'stop' | 'log-plan' | 'create';
  tasks: Task[];
  clients?: Client[];
  projects?: Project[];
}

const SessionModal: React.FC<SessionModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  onDelete,
  session, 
  initialData, 
  mode,
  tasks,
  clients = [],
  projects = []
}) => {
  const [notes, setNotes] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Allocation State
  const [isAllocating, setIsAllocating] = useState(false);
  const [allocType, setAllocType] = useState<'task' | 'quick' | 'project'>('task');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [quickClientId, setQuickClientId] = useState('');
  
  // Project Allocation State
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState('');

  useEffect(() => {
    if (isOpen) {
      setShowDeleteConfirm(false);
      setError(null);
      
      const activeTaskId = session?.taskId || initialData?.taskId;
      const activeCustomTitle = session?.customTitle;
      const activeProjectId = session?.projectId || initialData?.projectId;

      // Check if we need to allocate (Unallocated Task)
      if (!activeTaskId && !activeCustomTitle && !activeProjectId && (mode === 'create' || mode === 'stop' || (mode === 'edit' && session))) {
          if (initialData?.projectId) {
              setIsAllocating(true);
              setAllocType('project');
              setSelectedProjectId(initialData.projectId);
              setSelectedMilestoneId(initialData.milestoneId || '');
          } else {
              setIsAllocating(true);
              setAllocType('task');
              setSelectedTaskId('');
              setQuickClientId('');
              setSelectedProjectId('');
              setSelectedMilestoneId('');
          }
      } else {
          setIsAllocating(false);
      }

      // Initialize Notes & Time
      let initialNotes = '';
      if (mode === 'stop' && initialData && !initialData.notes) {
        initialNotes = '';
      } else if ((mode === 'edit' || mode === 'create') && session) {
        initialNotes = session.notes || '';
        setStartTime(new Date(session.startTime).toTimeString().slice(0, 5));
        setEndTime(session.endTime ? new Date(session.endTime).toTimeString().slice(0, 5) : '');
      } else if (mode === 'create' && !session) {
          const now = new Date();
          setStartTime(now.toTimeString().slice(0, 5));
          setEndTime(new Date(now.getTime() + 1800000).toTimeString().slice(0, 5));
      }
      
      setNotes(initialNotes);
      // Wait for render to populate div
      setTimeout(() => {
        if (editorRef.current) {
            editorRef.current.innerHTML = initialNotes;
        }
      }, 50);

    }
  }, [isOpen, session, initialData, mode]);

  if (!isOpen) return null;

  const handleFormat = (command: string) => {
    document.execCommand(command, false, undefined);
    if (editorRef.current) {
        setNotes(editorRef.current.innerHTML);
    }
  };

  const handleSave = () => {
    setError(null);
    const updates: Partial<TimerSession> = { notes };
    const activeProjectId = session?.projectId || initialData?.projectId;
    const activeTaskId = session?.taskId || initialData?.taskId;
    
    if (isAllocating) {
        if (allocType === 'task') {
            if (!selectedTaskId) return;
            updates.taskId = selectedTaskId;
            updates.clientId = undefined;
            updates.customTitle = undefined;
            updates.projectId = undefined;
            updates.milestoneId = undefined;
        } else if (allocType === 'project') {
             if (!selectedProjectId) return;
             updates.projectId = selectedProjectId;
             updates.milestoneId = selectedMilestoneId || undefined;
             updates.taskId = undefined;
             updates.clientId = undefined;
             
             const proj = projects.find(p => p.id === selectedProjectId);
             const mile = proj?.milestones.find(m => m.id === selectedMilestoneId);
             let title = proj?.title || 'Project Work';
             if (mile) title += ` - ${mile.title}`;
             updates.customTitle = title;
             if (proj) updates.clientId = proj.clientId;
        } else {
            const client = clients.find(c => c.id === quickClientId);
            let generatedTitle = 'Quick Entry';
            // Strip HTML for title generation
            const plainText = notes.replace(/<[^>]*>?/gm, '');
            
            if (plainText && plainText.trim().length > 0) {
                 generatedTitle = plainText.substring(0, 30) + (plainText.length > 30 ? '...' : '');
            } else if (client) {
                 generatedTitle = `${client.name} Log`;
            }

            updates.customTitle = generatedTitle;
            updates.clientId = quickClientId || undefined;
            updates.taskId = undefined;
            updates.projectId = undefined;
            updates.milestoneId = undefined;
        }
    } else {
        if (activeProjectId) {
             updates.projectId = activeProjectId;
             updates.milestoneId = session?.milestoneId || initialData?.milestoneId;

             const proj = projects?.find(p => p.id === activeProjectId);
             const mile = proj?.milestones.find(m => m.id === updates.milestoneId);

             if (proj) {
                 updates.clientId = proj.clientId;
                 let contextHeader = proj.title;
                 if (mile) contextHeader += ` - ${mile.title}`;

                 updates.customTitle = contextHeader;

                 if (mode === 'create') {
                     // Notes already contain HTML from editor, append header if needed? 
                     // Actually, for rich text, prepending "Project - Milestone: " inside the HTML is tricky.
                     // We will just let the title handle the context and keep notes as user input.
                     // Or, we prepend a paragraph.
                     if (!notes.includes(contextHeader)) {
                        updates.notes = `<b>${contextHeader}</b>: <br/>${notes}`;
                     }
                 }
             }
        }
        if (activeTaskId) {
            updates.taskId = activeTaskId;
        }
    }

    if ((mode === 'edit' || mode === 'create')) {
      const baseTime = session?.startTime || Date.now();
      const date = new Date(baseTime);
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();

      let newStart = session?.startTime || Date.now();
      let newEnd = session?.endTime || Date.now();

      if (startTime) {
        const [h, m] = startTime.split(':').map(Number);
        newStart = new Date(year, month, day, h, m).getTime();
        updates.startTime = newStart;
      }

      if (endTime) {
        const [h, m] = endTime.split(':').map(Number);
        newEnd = new Date(year, month, day, h, m).getTime();
        updates.endTime = newEnd;
      }

      if (newEnd < newStart) {
        setError('End time cannot be before Start time. Did you mean xx:xx PM?');
        return;
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
  const activeProjectId = session?.projectId || initialData?.projectId;
  
  let taskTitle = 'Unallocated Activity';
  if (activeTaskId) {
      taskTitle = tasks.find(t => t.id === activeTaskId)?.title || 'Unknown Task';
  } else if (activeProjectId) {
      const p = projects.find(pr => pr.id === activeProjectId);
      taskTitle = p ? `Project: ${p.title}` : 'Unknown Project';
      if (session?.milestoneId || initialData?.milestoneId) {
          const m = p?.milestones.find(mi => mi.id === (session?.milestoneId || initialData?.milestoneId));
          if (m) taskTitle += ` (${m.title})`;
      }
  } else if (session?.customTitle) {
      taskTitle = session.customTitle;
  }

  // Resolve client name for modal title
  let modalClientName: string | null = null;
  if (mode === 'edit' && session) {
    const resolvedClientId = session.clientId || (session.taskId ? tasks.find(t => t.id === session.taskId)?.clientId : undefined);
    if (resolvedClientId) {
      modalClientName = clients.find(c => c.id === resolvedClientId)?.name || null;
    }
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            {mode === 'stop' ? <Clock className="text-indigo-400" /> : <Clock className="text-emerald-400" />}
            {mode === 'stop' ? 'Save Session Notes' : mode === 'create' ? 'Create New Entry' : `Edit Session${modalClientName ? ` - ${modalClientName}` : ''}`}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-300 p-3 rounded-lg flex items-start gap-2 text-sm">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p>{error}</p>
            </div>
          )}

          {!isAllocating ? (
            <div className="bg-slate-700/30 p-3 rounded-lg border border-slate-700">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Activity Context</p>
                <p className="text-white font-medium truncate">{taskTitle}</p>
            </div>
          ) : (
            <div className="space-y-3 p-4 bg-slate-900/30 rounded-xl border border-dashed border-indigo-500/30">
                <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">Allocate Time</h4>
                </div>
                
                <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
                    <button onClick={() => setAllocType('task')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-medium transition-all ${allocType === 'task' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}><CheckSquare size={14} /> Task</button>
                    <button onClick={() => setAllocType('project')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-medium transition-all ${allocType === 'project' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}><FolderKanban size={14} /> Project</button>
                    <button onClick={() => setAllocType('quick')} className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-medium transition-all ${allocType === 'quick' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}><Zap size={14} /> Quick</button>
                </div>

                {allocType === 'task' && (
                     <div>
                        <select
                            value={selectedTaskId}
                            onChange={(e) => setSelectedTaskId(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        >
                            <option value="">-- Select Task --</option>
                            {tasks.filter(t => t.status !== 'done').map(t => (
                                <option key={t.id} value={t.id}>{t.title}</option>
                            ))}
                        </select>
                     </div>
                )}

                {allocType === 'project' && (
                     <div className="space-y-2">
                        <select
                            value={selectedProjectId}
                            onChange={(e) => { setSelectedProjectId(e.target.value); setSelectedMilestoneId(''); }}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        >
                            <option value="">-- Select Project --</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                        </select>
                        
                        {selectedProject && (
                            <select
                                value={selectedMilestoneId}
                                onChange={(e) => setSelectedMilestoneId(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            >
                                <option value="">-- Select Milestone (Optional) --</option>
                                {selectedProject.milestones.map(m => (
                                    <option key={m.id} value={m.id}>{m.title} {m.isCompleted ? '(Done)' : ''}</option>
                                ))}
                            </select>
                        )}
                     </div>
                )}

                {allocType === 'quick' && (
                    <div className="space-y-2">
                        <select
                            value={quickClientId}
                            onChange={(e) => setQuickClientId(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                            <option value="">-- No Client (Personal/Admin) --</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                )}
            </div>
          )}

          {(mode === 'edit' || mode === 'create') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Start Time</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">End Time</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={`w-full bg-slate-900 border rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none ${error ? 'border-red-500' : 'border-slate-700'}`} />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              {mode === 'stop' ? 'What did you work on?' : 'Description / Notes'}
            </label>
            
            {/* Rich Text Editor */}
            <div className="border border-slate-700 rounded-lg overflow-hidden bg-slate-900 focus-within:ring-2 focus-within:ring-indigo-500 transition-shadow">
                <div className="flex items-center gap-1 p-2 border-b border-slate-700 bg-slate-800">
                    <button onClick={() => handleFormat('bold')} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded" title="Bold">
                        <Bold size={16} />
                    </button>
                    <button onClick={() => handleFormat('italic')} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded" title="Italic">
                        <Italic size={16} />
                    </button>
                    <button onClick={() => handleFormat('insertUnorderedList')} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded" title="Bullet List">
                        <List size={16} />
                    </button>
                </div>
                <div 
                    ref={editorRef}
                    contentEditable 
                    className="p-3 min-h-[120px] outline-none text-white text-sm leading-relaxed max-h-[200px] overflow-y-auto"
                    onInput={(e) => setNotes(e.currentTarget.innerHTML)}
                    onBlur={(e) => setNotes(e.currentTarget.innerHTML)}
                />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Supports rich text. Select text to format.</p>
          </div>
        </div>

        <div className="p-4 bg-slate-900/50 border-t border-slate-700 flex justify-between gap-3 shrink-0">
          <div>
            {mode !== 'create' && onDelete && (
              !showDeleteConfirm ? (
                <button onClick={() => setShowDeleteConfirm(true)} className="px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2">
                  <Trash2 size={18} /> <span className="text-sm">Delete</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                   <button onClick={handleDelete} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors">Yes, Delete</button>
                   <button onClick={() => setShowDeleteConfirm(false)} className="p-1.5 text-slate-400 hover:text-white"><X size={14} /></button>
                </div>
              )
            )}
          </div>
          
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
            <button
                onClick={handleSave}
                disabled={isAllocating && (allocType === 'task' && !selectedTaskId)}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg shadow-lg shadow-indigo-900/20 flex items-center gap-2 transition-transform active:scale-95"
            >
                <Save size={18} />
                {mode === 'stop' ? 'Stop & Save' : mode === 'create' ? 'Create Entry' : 'Update Session'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionModal;