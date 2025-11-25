import React, { useState, useEffect } from 'react';
import { Task, TimerSession, Client } from '../types';
import { Search, X, Calendar, Clock, FileText, Hash } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  sessions: TimerSession[];
  clients: Client[];
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, tasks, sessions, clients }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ type: 'task' | 'session', item: any, score: number }[]>([]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const hits: { type: 'task' | 'session', item: any, score: number }[] = [];

    // Search Tasks
    tasks.forEach(task => {
      let score = 0;
      if (task.title.toLowerCase().includes(lowerQuery)) score += 10;
      if (task.ticketNumber && task.ticketNumber.toLowerCase().includes(lowerQuery)) score += 15;
      if (task.description && task.description.toLowerCase().includes(lowerQuery)) score += 5;
      
      if (score > 0) {
        hits.push({ type: 'task', item: task, score });
      }
    });

    // Search Sessions (Notes)
    sessions.forEach(session => {
       let score = 0;
       // We need to check stripHtml content too, but checking raw HTML string is usually fine for search
       if (session.notes && session.notes.toLowerCase().includes(lowerQuery)) score += 10;
       if (session.customTitle && session.customTitle.toLowerCase().includes(lowerQuery)) score += 10;
       
       if (score > 0) {
         hits.push({ type: 'session', item: session, score });
       }
    });

    setResults(hits.sort((a, b) => b.score - a.score));
  }, [query, tasks, sessions]);

  const stripHtml = (html: string) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center gap-3">
           <Search className="text-slate-400" />
           <input
             autoFocus
             type="text"
             placeholder="Search tasks, tickets, or session notes..."
             value={query}
             onChange={(e) => setQuery(e.target.value)}
             className="flex-1 bg-transparent text-white text-lg outline-none placeholder-slate-600"
           />
           <button onClick={onClose} className="text-slate-500 hover:text-white">
             <X size={24} />
           </button>
        </div>

        {/* Results */}
        <div className="overflow-y-auto p-2 space-y-1">
           {results.length === 0 && query && (
             <div className="text-center py-8 text-slate-500">No matches found.</div>
           )}
           {results.length === 0 && !query && (
             <div className="text-center py-8 text-slate-500">Type to search...</div>
           )}

           {results.map((hit, idx) => {
              if (hit.type === 'task') {
                const task = hit.item as Task;
                const client = clients.find(c => c.id === task.clientId);
                return (
                  <div key={`t-${task.id}`} className="p-3 hover:bg-slate-800 rounded-lg group border border-transparent hover:border-slate-700 transition-colors">
                     <div className="flex items-center gap-2 mb-1">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-300">Task</span>
                        {client && <span className="text-xs text-slate-400">{client.name}</span>}
                        {task.ticketNumber && <span className="text-xs font-mono text-slate-500 bg-slate-800 px-1 rounded flex items-center gap-0.5"><Hash size={10}/>{task.ticketNumber}</span>}
                     </div>
                     <h4 className="text-white font-medium">{task.title}</h4>
                     {task.description && <p className="text-sm text-slate-500 truncate mt-1">{task.description}</p>}
                  </div>
                );
              } else {
                const session = hit.item as TimerSession;
                const task = tasks.find(t => t.id === session.taskId);
                return (
                   <div key={`s-${session.id}`} className="p-3 hover:bg-slate-800 rounded-lg group border border-transparent hover:border-slate-700 transition-colors">
                     <div className="flex items-center gap-2 mb-1">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300">Log</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar size={12}/> {new Date(session.startTime).toLocaleDateString()}</span>
                        {session.endTime && <span className="text-xs text-slate-500 flex items-center gap-1"><Clock size={12}/> {Math.round((session.endTime - session.startTime)/60000)}m</span>}
                     </div>
                     <div className="text-sm text-slate-200 mb-1">
                        {task ? task.title : (session.customTitle || 'Quick Log')}
                     </div>
                     {session.notes && (
                       <div className="flex items-start gap-2 text-sm text-slate-400 bg-slate-800/50 p-2 rounded">
                          <FileText size={14} className="mt-0.5 shrink-0" />
                          <span className="line-clamp-2">{stripHtml(session.notes)}</span>
                       </div>
                     )}
                   </div>
                );
              }
           })}
        </div>
        
        <div className="p-2 border-t border-slate-700 bg-slate-900/50 text-xs text-slate-500 text-right">
           Press ESC to close
        </div>
      </div>
    </div>
  );
};

export default SearchModal;