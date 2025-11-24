
import React, { useState, useMemo } from 'react';
import { Task, Subtask, Client, ActiveTimer } from '../types';
import { Play, Plus, ChevronDown, ChevronRight, CheckCircle2, Circle, Trash2, Wand2, Clock, Hash } from 'lucide-react';
import { generateSubtasks } from '../services/geminiService';

interface TaskBoardProps {
  tasks: Task[];
  subtasks: Subtask[];
  clients: Client[];
  activeTimer: ActiveTimer | null;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'totalTime' | 'status'>) => void;
  onAddSubtasks: (taskId: string, subtasks: { title: string }[]) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleSubtask: (subtaskId: string) => void;
  onStartTimer: (taskId: string, subtaskId?: string) => void;
  onStopTimer: () => void;
}

const TaskBoard: React.FC<TaskBoardProps> = ({
  tasks,
  subtasks,
  clients,
  activeTimer,
  onAddTask,
  onAddSubtasks,
  onDeleteTask,
  onToggleSubtask,
  onStartTimer,
  onStopTimer,
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [isAiLoading, setIsAiLoading] = useState<string | null>(null); // taskId being processed
  const [manualSubtaskInputs, setManualSubtaskInputs] = useState<{[key: string]: string}>({});
  
  // New Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskClient, setNewTaskClient] = useState('');
  const [newTaskTicket, setNewTaskTicket] = useState('');

  // --- Logic for Sorting and Top Clients ---
  const sortedClients = useMemo(() => 
    [...clients].sort((a, b) => a.name.localeCompare(b.name)), 
  [clients]);

  const { topClients, otherClients } = useMemo(() => {
     const counts: Record<string, number> = {};
     tasks.forEach(t => counts[t.clientId] = (counts[t.clientId] || 0) + 1);
     
     // Get Top 3 based on task count
     const topIds = Object.keys(counts)
        .filter(id => counts[id] > 0)
        .sort((a, b) => counts[b] - counts[a])
        .slice(0, 3);
        
     const top = topIds.map(id => clients.find(c => c.id === id)).filter((c): c is Client => !!c);
     const other = sortedClients.filter(c => !topIds.includes(c.id));
     
     return { topClients: top, otherClients: other };
  }, [tasks, clients, sortedClients]);

  // ---

  const filteredTasks = selectedClientId === 'all' 
    ? tasks 
    : tasks.filter(t => t.clientId === selectedClientId);

  const toggleTaskExpand = (taskId: string) => {
    const newSet = new Set(expandedTasks);
    if (newSet.has(taskId)) newSet.delete(taskId);
    else newSet.add(taskId);
    setExpandedTasks(newSet);
  };

  const handleManualSubtaskChange = (taskId: string, value: string) => {
    setManualSubtaskInputs(prev => ({...prev, [taskId]: value}));
  };

  const handleAddManualSubtask = (taskId: string) => {
    const title = manualSubtaskInputs[taskId];
    if (!title?.trim()) return;
    
    onAddSubtasks(taskId, [{ title }]);
    setManualSubtaskInputs(prev => ({...prev, [taskId]: ''}));
  };

  const handleGenerateSubtasks = async (task: Task) => {
    setIsAiLoading(task.id);
    try {
      const generated = await generateSubtasks(task.title, task.description);
      if (generated.length > 0) {
        onAddSubtasks(task.id, generated);
        // Auto expand
        const newSet = new Set(expandedTasks);
        newSet.add(task.id);
        setExpandedTasks(newSet);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiLoading(null);
    }
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskClient) return;
    onAddTask({
      title: newTaskTitle,
      description: newTaskDesc,
      clientId: newTaskClient,
      ticketNumber: newTaskTicket
    });
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskTicket('');
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div id="task-board" className="space-y-6 pb-24">
      {/* Header & Filters */}
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Tasks and Tickets</h2>
          <p className="text-slate-400 text-sm mt-1">Manage your workload and track time precisely.</p>
        </div>
        
        {/* Client Filters Row - Full Width Scrollable */}
        <div className="w-full">
           <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800/50">
              <button
                onClick={() => setSelectedClientId('all')}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${
                  selectedClientId === 'all' 
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-900/20' 
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                All Clients
              </button>
              
              {/* Top Clients Section */}
              {topClients.length > 0 && (
                <>
                   <div className="h-6 w-px bg-slate-700/50 mx-1 flex-shrink-0"></div>
                   {topClients.map(client => (
                    <button
                      key={client.id}
                      onClick={() => setSelectedClientId(client.id)}
                      className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border flex items-center gap-2 ${
                        selectedClientId === client.id 
                          ? 'bg-slate-700 text-white border-indigo-500 ring-1 ring-indigo-500/50 shadow-lg shadow-black/20' 
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200 hover:border-slate-600'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: client.color, color: client.color }}></span>
                      {client.name}
                    </button>
                  ))}
                </>
              )}

              {/* Separator between Top and Other */}
              {topClients.length > 0 && otherClients.length > 0 && (
                 <div className="h-6 w-px bg-slate-700/50 mx-1 flex-shrink-0"></div>
              )}

              {/* Other Clients */}
              {otherClients.map(client => (
                <button
                  key={client.id}
                  onClick={() => setSelectedClientId(client.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border flex items-center gap-2 ${
                    selectedClientId === client.id 
                      ? 'bg-slate-700 text-white border-indigo-500 ring-1 ring-indigo-500/50 shadow-lg shadow-black/20' 
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200 hover:border-slate-600'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: client.color }}></span>
                  {client.name}
                </button>
              ))}
           </div>
        </div>
      </div>

      {/* New Task Input */}
      <form onSubmit={handleCreateTask} className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-2">
            <input
              type="text"
              placeholder="What needs to be done?"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="flex-[2] bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              placeholder="Ticket # (Optional)"
              value={newTaskTicket}
              onChange={(e) => setNewTaskTicket(e.target.value)}
              className="md:w-32 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
        </div>
        <div className="flex flex-col md:flex-row gap-2 items-end">
           <input
            type="text"
            placeholder="Description (optional)"
            value={newTaskDesc}
            onChange={(e) => setNewTaskDesc(e.target.value)}
            className="flex-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex gap-2 w-full md:w-auto">
            <select
              value={newTaskClient}
              onChange={(e) => setNewTaskClient(e.target.value)}
              className="flex-1 md:w-48 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select Client...</option>
              {topClients.length > 0 && (
                <optgroup label="Frequently Used">
                  {topClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>
              )}
              <optgroup label="All Clients">
                  {otherClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </optgroup>
            </select>
            <button
              disabled={!newTaskTitle || !newTaskClient}
              type="submit"
              className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center space-x-2 whitespace-nowrap"
            >
              <Plus size={18} />
              <span>Add Task</span>
            </button>
          </div>
        </div>
      </form>

      {/* Task List */}
      <div className="space-y-4">
        {filteredTasks.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p>No tasks found. Select a client and add your first task.</p>
          </div>
        )}
        
        {filteredTasks.map(task => {
          const client = clients.find(c => c.id === task.clientId);
          const taskSubtasks = subtasks.filter(s => s.taskId === task.id);
          const isExpanded = expandedTasks.has(task.id);
          const isActive = activeTimer?.taskId === task.id && !activeTimer?.subtaskId;
          
          // Calculate total time including subtasks
          const aggregatedSubtaskTime = taskSubtasks.reduce((acc, curr) => acc + curr.totalTime, 0);
          const displayTotalTime = task.totalTime + aggregatedSubtaskTime;

          return (
            <div key={task.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden transition-all hover:border-slate-600">
              <div className="p-4 flex items-center gap-4">
                <button 
                  onClick={() => toggleTaskExpand(task.id)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </button>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span 
                      className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded text-slate-900"
                      style={{ backgroundColor: client?.color || '#cbd5e1' }}
                    >
                      {client?.name}
                    </span>
                    {task.ticketNumber && (
                       <span className="flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-slate-700 px-1.5 py-0.5 rounded">
                         <Hash size={10} /> {task.ticketNumber}
                       </span>
                    )}
                    <h3 className="text-lg font-semibold text-white ml-1">{task.title}</h3>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock size={14} /> {formatDuration(displayTotalTime)}
                    </span>
                    {task.description && <span className="truncate max-w-xs">{task.description}</span>}
                    {/* Render Documentation Link from first subtask if available */}
                    {taskSubtasks.length > 0 && (() => {
                      const firstSub = taskSubtasks[0];
                      const linkMatch = firstSub.title.match(/(https?:\/\/[^\s]+)/);
                      if (linkMatch) {
                          return (
                              <a href={linkMatch[0]} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-xs">
                                  Documentation Link
                              </a>
                          );
                      }
                      return null;
                    })()}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => isActive ? onStopTimer() : onStartTimer(task.id)}
                    className={`p-2 rounded-full transition-all ${
                      isActive 
                        ? 'bg-indigo-500/20 text-indigo-400 animate-pulse ring-1 ring-indigo-500' 
                        : 'bg-slate-700 text-slate-300 hover:bg-indigo-600 hover:text-white'
                    }`}
                    title={isActive ? "Stop Timer" : "Start Timer"}
                  >
                    {isActive ? <PauseIcon /> : <Play size={18} fill="currentColor" />}
                  </button>
                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="p-2 rounded-full hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Expanded Content (Subtasks) */}
              {isExpanded && (
                <div className="bg-slate-900/50 border-t border-slate-700/50 p-4 pl-12">
                  <div className="space-y-2">
                    {taskSubtasks.map(subtask => {
                      const isSubActive = activeTimer?.subtaskId === subtask.id;
                      
                      // Check for links in subtask titles
                      const linkMatch = subtask.title.match(/(https?:\/\/[^\s]+)/);
                      let displayTitle: React.ReactNode = subtask.title;
                      
                      if (linkMatch) {
                          const url = linkMatch[0];
                          const textBefore = subtask.title.substring(0, linkMatch.index);
                          // Clean up text by removing raw URL if appropriate or just leave it
                          // For now, let's render the text and a separate link icon/text
                          displayTitle = (
                              <span>
                                  {textBefore} 
                                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline inline-flex items-center gap-1 ml-1">
                                      {url.length > 30 ? 'Documentation Link' : url}
                                  </a>
                              </span>
                          );
                      }

                      return (
                        <div key={subtask.id} className="flex items-center justify-between group py-2 border-b border-slate-800/50 last:border-0">
                          <div className="flex items-center gap-3">
                            <button onClick={() => onToggleSubtask(subtask.id)} className="text-slate-500 hover:text-indigo-400">
                              {subtask.isCompleted ? (
                                <CheckCircle2 size={18} className="text-emerald-500" />
                              ) : (
                                <Circle size={18} />
                              )}
                            </button>
                            <span className={`${subtask.isCompleted ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                              {displayTitle}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500 font-mono">{formatDuration(subtask.totalTime)}</span>
                            <button
                              onClick={() => isSubActive ? onStopTimer() : onStartTimer(task.id, subtask.id)}
                              className={`p-1.5 rounded transition-all ${
                                isSubActive 
                                  ? 'text-indigo-400 bg-indigo-500/10' 
                                  : 'text-slate-600 hover:text-indigo-400 opacity-0 group-hover:opacity-100'
                              }`}
                            >
                              {isSubActive ? <PauseIcon size={14} /> : <Play size={14} fill="currentColor" />}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Manual Subtask Add */}
                  <div className="mt-4 flex gap-2">
                     <input 
                       type="text" 
                       placeholder="Add subtask manually..."
                       className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                       value={manualSubtaskInputs[task.id] || ''}
                       onChange={(e) => handleManualSubtaskChange(task.id, e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && handleAddManualSubtask(task.id)}
                     />
                     <button 
                       onClick={() => handleAddManualSubtask(task.id)}
                       className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded text-sm transition-colors"
                     >
                       Add
                     </button>
                  </div>

                  <div className="mt-4 pt-2 flex items-center gap-3 border-t border-slate-800">
                    <button
                      id="ai-breakdown-btn"
                      onClick={() => handleGenerateSubtasks(task)}
                      disabled={isAiLoading === task.id}
                      className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors"
                    >
                      {isAiLoading === task.id ? (
                        <div className="animate-spin h-3 w-3 border-2 border-indigo-400 border-t-transparent rounded-full" />
                      ) : (
                        <Wand2 size={14} />
                      )}
                      AI Breakdown (MS Stack)
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Helper for Pause Icon reuse
const PauseIcon = ({ size = 18 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="6" y="4" width="4" height="16" fill="currentColor" fillOpacity={0.2}></rect>
    <rect x="14" y="4" width="4" height="16" fill="currentColor" fillOpacity={0.2}></rect>
  </svg>
);

export default TaskBoard;
