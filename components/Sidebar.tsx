import React, { useRef } from 'react';
import { ViewMode } from '../types';
import { LayoutDashboard, CheckSquare, Users, PieChart, Zap, CalendarClock, Search, Disc, FolderKanban, Mountain, Download, Upload } from 'lucide-react';

interface SidebarProps {
  view: ViewMode;
  setView: (view: ViewMode) => void;
  onSearchClick: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ view, setView, onSearchClick, onExport, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navItems = [
    { id: ViewMode.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard, domId: 'nav-dashboard' },
    { id: ViewMode.TIMELINE, label: 'Day Timeline', icon: CalendarClock, domId: 'nav-timeline' },
    { id: ViewMode.TASKS, label: 'Tasks & Tickets', icon: CheckSquare, domId: 'nav-tasks' },
    { id: ViewMode.ROCKS, label: 'Quarterly Rocks', icon: Mountain, domId: 'nav-rocks' },
    { id: ViewMode.PROJECTS, label: 'Projects', icon: FolderKanban, domId: 'nav-projects' },
    { id: ViewMode.CLIENTS, label: 'Clients', icon: Users, domId: 'nav-clients' },
    { id: ViewMode.REPORTS, label: 'Analytics', icon: PieChart, domId: 'nav-reports' },
  ];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <aside id="sidebar" className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full hidden md:flex shrink-0">
      <div className="p-6 flex items-center space-x-3">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white">
          <Zap size={20} fill="currentColor" />
        </div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          ChronoFlow
        </h1>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            id={item.domId}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${view === item.id
                ? 'bg-indigo-600/10 text-indigo-400 shadow-sm shadow-indigo-900/20'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
          >
            <item.icon
              size={20}
              className={`transition-colors ${view === item.id ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'
                }`}
            />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}

        <div className="pt-4 mt-4 border-t border-slate-800/50">
          <button
            id="nav-focus"
            onClick={() => setView(ViewMode.FOCUS)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${view === ViewMode.FOCUS
                ? 'bg-emerald-500/10 text-emerald-400 shadow-sm shadow-emerald-900/20'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-emerald-300'
              }`}
          >
            <Disc
              size={20}
              className={`transition-colors ${view === ViewMode.FOCUS ? 'text-emerald-400' : 'text-slate-500 group-hover:text-emerald-300'
                }`}
            />
            <span className="font-medium">Focus Mode</span>
          </button>
        </div>
      </nav>

      <div className="p-6 border-t border-slate-800 space-y-4">
        {/* Data Management Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onExport}
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white py-2 px-3 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
            title="Export all data to JSON"
          >
            <Download size={14} /> Export
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white py-2 px-3 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
            title="Import data from JSON"
          >
            <Upload size={14} /> Import
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".json"
          />
        </div>

        <button
          onClick={onSearchClick}
          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white py-2 px-4 rounded-lg flex items-center gap-2 transition-colors text-sm border border-slate-700"
        >
          <Search size={16} />
          <span>Search History...</span>
        </button>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <p className="text-xs text-slate-500 mb-1">Status</p>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-sm text-slate-300 font-medium">Online</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;