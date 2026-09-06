import React, { useEffect, useState } from "react";
import { Task, TimerSession, Client, Project, Rock, ViewMode } from "../types";
import { Search, ArrowUpRight } from "lucide-react";
import Dialog from "./ui/Dialog";
interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  sessions: TimerSession[];
  clients: Client[];
  projects: Project[];
  rocks: Rock[];
  onNavigate: (view: ViewMode) => void;
  onSelectTask: (task: Task) => void;
  onSelectSession: (session: TimerSession) => void;
}
export default function SearchModal({
  isOpen,
  onClose,
  tasks,
  sessions,
  clients,
  projects,
  rocks,
  onNavigate,
  onSelectTask,
  onSelectSession,
}: SearchModalProps) {
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (isOpen) setQuery("");
  }, [isOpen]);
  if (!isOpen) return null;
  const plain = (value = "") => value.replace(/<[^>]*>?/gm, "");
  const records = [
    ...tasks.map((t) => ({
      id: `task-${t.id}`,
      kind: "Task",
      title: t.title,
      detail: [
        clients.find((c) => c.id === t.clientId)?.name,
        t.ticketNumber,
        t.description,
      ]
        .filter(Boolean)
        .join(" · "),
      open: () => onSelectTask(t),
    })),
    ...sessions.map((s) => ({
      id: `session-${s.id}`,
      kind: "Time entry",
      title:
        s.customTitle ||
        tasks.find((t) => t.id === s.taskId)?.title ||
        "Quick entry",
      detail: `${new Date(s.startTime).toLocaleDateString("en-AU")} · ${plain(s.notes)}`,
      open: () => onSelectSession(s),
    })),
    ...projects.map((p) => ({
      id: `project-${p.id}`,
      kind: "Project",
      title: p.title,
      detail: p.description,
      open: () => onNavigate(ViewMode.PROJECTS),
    })),
    ...rocks.map((r) => ({
      id: `rock-${r.id}`,
      kind: "Quarterly goal",
      title: r.title,
      detail: `${r.quarter} · ${r.description}`,
      open: () => onNavigate(ViewMode.ROCKS),
    })),
    ...clients.map((c) => ({
      id: `client-${c.id}`,
      kind: "Client",
      title: c.name,
      detail: [c.contactName, c.services].filter(Boolean).join(" · "),
      open: () => onNavigate(ViewMode.CLIENTS),
    })),
  ];
  const results = query.trim()
    ? records
        .filter((r) =>
          `${r.title} ${r.detail}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
        )
        .slice(0, 30)
    : [];
  return (
    <Dialog title="Find your way back." onClose={onClose}>
      <label className="search-field global-search">
        <Search size={18} />
        <input
          autoFocus
          aria-label="Search your workspace"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tasks, tickets, clients or a note you remember…"
        />
      </label>
      <div className="search-results">
        {results.map((result) => (
          <button
            key={result.id}
            className="search-result"
            aria-label={`Open ${result.kind}: ${result.title}`}
            onClick={() => {
              onClose();
              result.open();
            }}
          >
            <span>
              <small>{result.kind}</small>
              <strong>{result.title}</strong>
              <span>{result.detail}</span>
            </span>
            <ArrowUpRight size={17} />
          </button>
        ))}
        {!results.length && (
          <div className="empty-state compact">
            <p>
              {query.trim()
                ? "Nothing matches yet. Try a different word or ticket number."
                : "A task, a client, a half-remembered note. Start anywhere."}
            </p>
          </div>
        )}
      </div>
      <div className="search-help">
        <span>
          {results.length
            ? `${results.length} results${results.length === 30 ? " · Keep typing to narrow the search" : ""}`
            : "YOUR WHOLE WORKSPACE, CLOSE AT HAND"}
        </span>
        <span>Esc to close</span>
      </div>
    </Dialog>
  );
}
