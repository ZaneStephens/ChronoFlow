import React, { useRef } from "react";
import { ViewMode } from "../types";
import {
  House,
  CheckSquare2,
  Users,
  FileText,
  AudioLines,
  CalendarDays,
  Search,
  Focus,
  FolderKanban,
  Mountain,
  Download,
  Upload,
  X,
  HardDrive,
} from "lucide-react";

interface SidebarProps {
  view: ViewMode;
  setView: (view: ViewMode) => void;
  onSearchClick: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  mobileOpen: boolean;
  onClose: () => void;
  taskCount: number;
}
export const viewLabels: Record<ViewMode, string> = {
  DASHBOARD: "Overview",
  TIMELINE: "My day",
  TASKS: "Tasks & tickets",
  PROJECTS: "Projects",
  ROCKS: "Quarterly goals",
  CLIENTS: "Clients",
  REPORTS: "Reports",
  FOCUS: "Focus space",
};
const Sidebar: React.FC<SidebarProps> = ({
  view,
  setView,
  onSearchClick,
  onExport,
  onImport,
  mobileOpen,
  onClose,
  taskCount,
}) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const groups = [
    {
      label: "WORKSPACE",
      items: [
        { id: ViewMode.DASHBOARD, icon: House },
        { id: ViewMode.TIMELINE, icon: CalendarDays },
        { id: ViewMode.TASKS, icon: CheckSquare2 },
      ],
    },
    {
      label: "THE BIGGER PICTURE",
      items: [
        { id: ViewMode.PROJECTS, icon: FolderKanban },
        { id: ViewMode.ROCKS, icon: Mountain },
        { id: ViewMode.CLIENTS, icon: Users },
        { id: ViewMode.REPORTS, icon: FileText },
      ],
    },
  ];
  const navigate = (id: ViewMode) => {
    setView(id);
    onClose();
  };
  return (
    <>
      {mobileOpen && (
        <button
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={onClose}
        />
      )}
      <aside
        id="sidebar"
        className={`workspace-rail ${mobileOpen ? "is-open" : ""}`}
        aria-label="Workspace navigation"
      >
        <div className="brand">
          <span className="brand-symbol">
            <AudioLines size={24} />
          </span>
          <span>
            ChronoFlow
            <span className="brand-subtitle">MAKE SPACE FOR GOOD WORK</span>
          </span>
          <button
            className="mobile-close"
            aria-label="Close navigation"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <button
          className="rail-search"
          onClick={() => {
            onSearchClick();
            onClose();
          }}
        >
          <Search size={17} />
          <span>Find anything</span>
          <kbd>/</kbd>
        </button>
        <nav className="rail-nav">
          {groups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="rail-label">{group.label}</p>
              {group.items.map(({ id, icon: Icon }) => (
                <button
                  key={id}
                  id={`nav-${id.toLowerCase()}`}
                  className={`nav-item ${view === id ? "active" : ""}`}
                  aria-current={view === id ? "page" : undefined}
                  onClick={() => navigate(id)}
                >
                  <Icon size={19} />
                  <span>{viewLabels[id]}</span>
                  {id === ViewMode.TASKS && taskCount > 0 && (
                    <span className="nav-count">{taskCount}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
          <button
            id="nav-focus"
            className={`nav-item focus-nav ${view === ViewMode.FOCUS ? "active" : ""}`}
            onClick={() => navigate(ViewMode.FOCUS)}
            aria-current={view === ViewMode.FOCUS ? "page" : undefined}
          >
            <Focus size={19} />
            <span>Focus space</span>
            <span className="focus-dot" />
          </button>
        </nav>
        <div className="rail-bottom">
          <div className="local-note">
            <HardDrive size={16} />
            <div>
              <strong>Your own workspace</strong>
              <span>Data stays in this browser</span>
            </div>
          </div>
          <div className="backup-actions">
            <button onClick={onExport}>
              <Download size={15} /> Back up
            </button>
            <button onClick={() => fileInput.current?.click()}>
              <Upload size={15} /> Import
            </button>
          </div>
          <input
            aria-label="Import ChronoFlow backup"
            type="file"
            accept=".json,application/json"
            ref={fileInput}
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImport(file);
              e.target.value = "";
            }}
          />
          <div className="rail-footer">
            A little more focus. A little less friction.
          </div>
        </div>
      </aside>
    </>
  );
};
export default Sidebar;
