import React, { useState, useEffect } from 'react';
import { Task, TimerSession, Client, Project, Rock, ViewMode } from '../types';
import { Search, X, Calendar, Clock, FileText, Hash, FolderKanban, Target } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  sessions?: TimerSession[];
  clients: Client[];
  projects?: Project[];
  rocks?: Rock[];
  onNavigate?: (view: ViewMode) => void;
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, tasks, sessions = [], clients, projects = [], rocks = [], onNavigate }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ type: 'task' | 'session' | 'project' | 'rock', item: any, score: number, matchedOn?: string }[]>([]);

  const stripHtml = (html: string) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

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
    const hits: { type: 'task' | 'session' | 'project' | 'rock', item: any, score: number, matchedOn?: string }[] = [];

    // Search Tasks
    tasks.forEach(task => {
      let score = 0;
      let matchedOn: string | undefined;
      if (task.title.toLowerCase().includes(lowerQuery)) { score += 10; matchedOn = task.title; }
      if (task.ticketNumber && task.ticketNumber.toLowerCase().includes(lowerQuery)) { score += 15; matchedOn = task.ticketNumber; }
      if (task.description && task.description.toLowerCase().includes(lowerQuery)) { score += 5; matchedOn = task.description; }
      if (score > 0) hits.push({ type: 'task', item: task, score, matchedOn });
    });

    // Search Sessions — search stripped HTML notes
    sessions.forEach(session => {
      let score = 0;
      let matchedOn: string | undefined;
      if (session.customTitle && session.customTitle.toLowerCase().includes(lowerQuery)) {
        score += 10;
        matchedOn = session.customTitle;
      }
      if (session.notes) {
        const plainText = stripHtml(session.notes);
        if (plainText.toLowerCase().includes(lowerQuery)) {
          score += 12; // Higher weight for note matches
          if (!matchedOn) matchedOn = plainText;
        }
      }
      if (score > 0) hits.push({ type: 'session', item: session, score, matchedOn });
    });

    // Search Projects
    projects.forEach(project => {
      let score = 0;
      let matchedOn: string | undefined;
      if (project.title.toLowerCase().includes(lowerQuery)) { score += 10; matchedOn = project.title; }
      if (project.description.toLowerCase().includes(lowerQuery)) { score += 5; matchedOn = project.description; }
      if (project.tags?.some(t => t.toLowerCase().includes(lowerQuery))) score += 3;
      if (score > 0) hits.push({ type: 'project', item: project, score, matchedOn });
    });

    // Search Rocks
    rocks.forEach(rock => {
      let score = 0;
      let matchedOn: string | undefined;
      if (rock.title.toLowerCase().includes(lowerQuery)) { score += 10; matchedOn = rock.title; }
      if (rock.description.toLowerCase().includes(lowerQuery)) { score += 5; matchedOn = rock.description; }
      if (score > 0) hits.push({ type: 'rock', item: rock, score, matchedOn });
    });

    setResults(hits.sort((a, b) => b.score - a.score));
  }, [query, tasks, sessions, projects, rocks]);

  const highlightMatch = (text: string): React.ReactNode => {
    if (!query.trim()) return text;
    const lowerText = text.toLowerCase();
    const idx = lowerText.indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="text-indigo-300 bg-indigo-500/20 rounded px-0.5">{text.slice(idx, idx + query.length)}</span>
        {text.slice(idx + query.length)}
      </>
    );
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
                     <h4 className="text-white font-medium">{highlightMatch(task.title)}</h4>
                     {task.description && <p className="text-sm text-slate-500 truncate mt-1">{task.description}</p>}
                  </div>
                );
              } else if (hit.type === 'project') {
                const project = hit.item as Project;
                const client = clients.find(c => c.id === project.clientId);
                return (
                  <div key={`p-${project.id}`} className="p-3 hover:bg-slate-800 rounded-lg group border border-transparent hover:border-slate-700 transition-colors">
                     <div className="flex items-center gap-2 mb-1">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/20 text-blue-300"><FolderKanban size={12} className="inline mr-0.5" />Project</span>
                        {client && <span className="text-xs text-slate-400">{client.name}</span>}
                        <span className={`text-[10px] font-medium uppercase ${project.status === 'active' ? 'text-emerald-400' : project.status === 'planning' ? 'text-amber-400' : 'text-slate-500'}`}>{project.status}</span>
                     </div>
                     <h4 className="text-white font-medium">{highlightMatch(project.title)}</h4>
                     {project.description && <p className="text-sm text-slate-500 truncate mt-1">{project.description}</p>}
                  </div>
                );
              } else if (hit.type === 'rock') {
                const rock = hit.item as Rock;
                return (
                  <div key={`r-${rock.id}`} className="p-3 hover:bg-slate-800 rounded-lg group border border-transparent hover:border-slate-700 transition-colors">
                     <div className="flex items-center gap-2 mb-1">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300"><Target size={12} className="inline mr-0.5" />Rock</span>
                        <span className="text-xs text-slate-400">{rock.quarter}</span>
                        <span className={`text-[10px] font-medium uppercase ${rock.status === 'on-track' ? 'text-emerald-400' : rock.status === 'at-risk' ? 'text-amber-400' : rock.status === 'off-track' ? 'text-red-400' : 'text-slate-500'}`}>{rock.status}</span>
                     </div>
                     <h4 className="text-white font-medium">{highlightMatch(rock.title)}</h4>
                     {rock.description && <p className="text-sm text-slate-500 truncate mt-1">{rock.description}</p>}
                  </div>
                );
              } else {
                const session = hit.item as TimerSession;
                const task = tasks.find(t => t.id === session.taskId);
                const matchedText = typeof hit.matchedOn === 'string' ? hit.matchedOn : '';
                const preview = session.notes ? stripHtml(session.notes) : '';
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
                     {preview && (
                       <div className="flex items-start gap-2 text-sm text-slate-400 bg-slate-800/50 p-2 rounded">
                          <FileText size={14} className="mt-0.5 shrink-0" />
                          <span className="line-clamp-2">{highlightMatch(preview)}</span>
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