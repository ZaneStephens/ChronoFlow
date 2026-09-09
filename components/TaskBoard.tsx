import ClientOptions from "./ui/ClientOptions";
import React, { useState } from "react";
import { Task, Subtask, Client, ActiveTimer } from "../types";
import {
  Play,
  Square,
  Plus,
  Search,
  LayoutGrid,
  List,
  Check,
  ChevronDown,
  ChevronRight,
  Trash2,
  Wand2,
  Clock3,
  Pencil,
  X,
  ArrowUpRight,
} from "lucide-react";
import { generateSubtasks } from "../services/geminiService";
import { durationLabel } from "../services/workspaceMetrics";
import Dialog from "./ui/Dialog";

interface TaskBoardProps {
  tasks: Task[];
  subtasks: Subtask[];
  clients: Client[];
  activeTimer: ActiveTimer | null;
  onAddTask: (
    task: Omit<Task, "id" | "createdAt" | "totalTime" | "status">,
  ) => void;
  onUpdateTask: (task: Task) => void;
  onUpdateSubtask: (id: string, title: string) => void;
  onAddSubtasks: (
    taskId: string,
    subtasks: { title: string; link?: string }[],
  ) => void;
  onDeleteTask: (id: string) => void;
  onDeleteSubtask: (id: string) => void;
  onToggleSubtask: (id: string) => void;
  onStartTimer: (taskId: string, subtaskId?: string) => void;
  onStopTimer: () => void;
  onPreviewTask?: (task: Task) => void;
}
const TaskBoard: React.FC<TaskBoardProps> = (props) => {
  const {
    tasks,
    subtasks,
    clients,
    activeTimer,
    onAddTask,
    onUpdateTask,
    onAddSubtasks,
    onDeleteTask,
    onDeleteSubtask,
    onToggleSubtask,
    onStartTimer,
    onStopTimer,
  } = props;
  const [query, setQuery] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [layout, setLayout] = useState<"board" | "list">("board");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");
  const [link, setLink] = useState("");
  const statuses: Task["status"][] = ["todo", "in-progress", "done"];
  const labels = { todo: "To do", "in-progress": "In progress", done: "Done" };
  const filtered = tasks
    .filter(
      (t) =>
        (clientFilter === "all" || t.clientId === clientFilter) &&
        `${t.title} ${t.description} ${t.ticketNumber || ""} ${clients.find((c) => c.id === t.clientId)?.name || ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => b.createdAt - a.createdAt);
  const openForm = (task?: Task) => {
    setEditing(task || null);
    setTitle(task?.title || "");
    setDescription(task?.description || "");
    setClientId(
      task?.clientId ||
        (clientFilter !== "all" ? clientFilter : clients[0]?.id || ""),
    );
    setTicketNumber(task?.ticketNumber || "");
    setLink(task?.link || "");
    setFormOpen(true);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !clientId) return;
    const values = {
      title: title.trim(),
      description,
      clientId,
      ticketNumber,
      link,
    };
    if (editing) onUpdateTask({ ...editing, ...values });
    else onAddTask(values);
    setFormOpen(false);
  };
  const generate = async (task: Task) => {
    setBusy(task.id);
    setError("");
    try {
      const results = await generateSubtasks(
        task.title,
        task.description,
        "technical",
        clients.find((c) => c.id === task.clientId)?.isInternal || false,
      );
      if (!results.length) throw new Error("No suggestions returned");
      onAddSubtasks(task.id, results);
      setExpanded(task.id);
    } catch {
      setError(
        "Suggestions are unavailable right now. You can still add steps manually.",
      );
    } finally {
      setBusy(null);
    }
  };
  const taskCard = (task: Task) => {
    const client = clients.find((c) => c.id === task.clientId);
    const steps = subtasks.filter((s) => s.taskId === task.id);
    const running = activeTimer?.taskId === task.id;
    return (
      <article
        className={`work-card ${running ? "tracked" : ""}`}
        key={task.id}
      >
        <div className="work-card-top">
          <span className="client-label">
            <i
              className="client-dot"
              style={{ background: client?.color || "#849589" }}
            />
            {client?.name || "Unassigned"}
          </span>
          <button
            className="icon-button subtle"
            aria-label={`Edit ${task.title}`}
            onClick={() => openForm(task)}
          >
            <Pencil size={15} />
          </button>
        </div>
        <button
          className="work-card-title"
          onClick={() => {
            setExpanded(expanded === task.id ? null : task.id);
            setSubtaskTitle("");
          }}
        >
          {task.title}
        </button>
        {task.description && (
          <p className="work-description">{task.description}</p>
        )}
        {task.ticketNumber && (
          <span className="ticket-label">#{task.ticketNumber}</span>
        )}
        <div className="work-card-bottom">
          <button
            className="steps-toggle"
            aria-expanded={expanded === task.id}
            onClick={() => {
              setExpanded(expanded === task.id ? null : task.id);
              setSubtaskTitle("");
            }}
          >
            {expanded === task.id ? (
              <ChevronDown size={15} />
            ) : (
              <ChevronRight size={15} />
            )}
            {steps.filter((s) => s.isCompleted).length}/{steps.length} steps
          </button>
          <span className="task-duration">
            <Clock3 size={13} />
            {durationLabel(
              task.totalTime + steps.reduce((sum, s) => sum + s.totalTime, 0),
            )}
          </span>
          <button
            className={`icon-button ${running ? "running" : ""}`}
            aria-label={`${running ? "Stop" : "Start"} ${task.title}`}
            onClick={() => (running ? onStopTimer() : onStartTimer(task.id))}
          >
            {running ? <Square size={15} /> : <Play size={15} />}
          </button>
        </div>
        <div className="work-status">
          <label className="sr-only" htmlFor={`status-${task.id}`}>
            Status of {task.title}
          </label>
          <select
            id={`status-${task.id}`}
            value={task.status}
            onChange={(e) =>
              onUpdateTask({
                ...task,
                status: e.target.value as Task["status"],
              })
            }
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {labels[status]}
              </option>
            ))}
          </select>
          {running && (
            <span className="tracking-label">
              <i />
              Tracking
            </span>
          )}
        </div>
        {expanded === task.id && (
          <div className="task-details">
            {steps.map((step) => (
              <div className="subtask-row" key={step.id}>
                <button
                  className={`complete-control ${step.isCompleted ? "checked" : ""}`}
                  aria-label={`${step.isCompleted ? "Reopen" : "Complete"} ${step.title}`}
                  onClick={() => onToggleSubtask(step.id)}
                >
                  <Check size={14} />
                </button>
                <span className={step.isCompleted ? "completed-text" : ""}>
                  {step.title}
                </span>
                <button
                  className="icon-button subtle"
                  aria-label={`Start ${step.title}`}
                  onClick={() => onStartTimer(task.id, step.id)}
                >
                  <Play size={13} />
                </button>
                <button
                  className="icon-button subtle"
                  aria-label={`Remove ${step.title}`}
                  onClick={() => onDeleteSubtask(step.id)}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
            <form
              className="add-step"
              onSubmit={(e) => {
                e.preventDefault();
                if (subtaskTitle.trim()) {
                  onAddSubtasks(task.id, [{ title: subtaskTitle.trim() }]);
                  setSubtaskTitle("");
                }
              }}
            >
              <input
                aria-label={`Add a step to ${task.title}`}
                placeholder="Add a small next step…"
                value={subtaskTitle}
                onChange={(e) => setSubtaskTitle(e.target.value)}
              />
              <button
                type="submit"
                className="icon-button"
                aria-label="Add step"
                disabled={!subtaskTitle.trim()}
              >
                <Plus size={16} />
              </button>
            </form>
            <div className="detail-actions">
              <button
                className="text-button"
                onClick={() => generate(task)}
                disabled={busy !== null}
              >
                <Wand2 size={14} />
                {busy === task.id ? "Thinking…" : "Suggest steps"}
              </button>
              {task.link && /^https?:\/\//i.test(task.link) && (
                <a
                  className="text-button"
                  href={task.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ticket <ArrowUpRight size={14} />
                </a>
              )}
              <button
                className="icon-button danger"
                aria-label={`Delete ${task.title}`}
                onClick={() => setPendingDelete(task)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}
      </article>
    );
  };
  return (
    <div id="task-board" className="workspace-page tasks-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">FROM TO-DO TO DONE</p>
          <h1>Good work starts here.</h1>
          <p>A home for the tickets, tasks and little next steps.</p>
        </div>
        <button className="button primary" onClick={() => openForm()}>
          <Plus size={17} /> New task
        </button>
      </div>
      <div className="task-toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="Search tasks"
            placeholder="Search tasks, clients or ticket numbers…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button aria-label="Clear task search" onClick={() => setQuery("")}>
              <X size={15} />
            </button>
          )}
        </label>
        <select
          aria-label="Filter tasks by client"
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
        >
          <option value="all">All clients</option>
          <ClientOptions clients={clients} />
        </select>
        <div className="segmented-control" aria-label="Task layout">
          <button
            aria-label="Board view"
            aria-pressed={layout === "board"}
            className={layout === "board" ? "selected" : ""}
            onClick={() => setLayout("board")}
          >
            <LayoutGrid size={17} />
          </button>
          <button
            aria-label="List view"
            aria-pressed={layout === "list"}
            className={layout === "list" ? "selected" : ""}
            onClick={() => setLayout("list")}
          >
            <List size={17} />
          </button>
        </div>
      </div>
      {error && (
        <div className="inline-notice" role="alert">
          {error}
          <button aria-label="Dismiss message" onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}
      <div
        className={`task-board-grid ${layout === "list" ? "list-layout" : ""}`}
      >
        {statuses.map((status) => (
          <section className={`board-column ${status}`} key={status}>
            <div className="column-heading">
              <h2>
                <i />
                {labels[status]}
                <span>
                  {filtered.filter((t) => t.status === status).length}
                </span>
              </h2>
              {status === "todo" && (
                <button
                  className="icon-button subtle"
                  aria-label="Add task"
                  onClick={() => openForm()}
                >
                  <Plus size={17} />
                </button>
              )}
            </div>
            <div className="column-cards">
              {filtered.filter((t) => t.status === status).map(taskCard)}
              {!filtered.some((t) => t.status === status) && (
                <div className="column-empty">
                  {query || clientFilter !== "all"
                    ? "No matching tasks"
                    : status === "todo"
                      ? "A fresh start. Add your first task."
                      : status === "in-progress"
                        ? "Ready for your next move."
                        : "Good things take a little time."}
                </div>
              )}
            </div>
            {status === "todo" && (
              <button className="add-card" onClick={() => openForm()}>
                <Plus size={16} /> Add a task
              </button>
            )}
          </section>
        ))}
      </div>
      {formOpen && (
        <Dialog
          title={editing ? "A little fine-tuning." : "What’s the next move?"}
          onClose={() => setFormOpen(false)}
        >
          <p className="dialog-description">
            Give your task a clear name and a client. You can fill in the rest
            as you go.
          </p>
          <form className="workspace-form" onSubmit={submit}>
            <label>
              Task name
              <input
                autoFocus
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Review endpoint security policies"
              />
            </label>
            <div className="form-columns">
              <label>
                Client
                <select
                  required
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                >
                  <option value="" disabled>
                    Select a client
                  </option>
                  <ClientOptions clients={clients} />
                </select>
              </label>
              <label>
                Ticket number <span>optional</span>
                <input
                  value={ticketNumber}
                  onChange={(e) => setTicketNumber(e.target.value)}
                  placeholder="e.g. 10482"
                />
              </label>
            </div>
            {!clients.length && (
              <p className="inline-notice">
                Add a client in Clients before creating your first task.
              </p>
            )}
            <label>
              Description <span>optional</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does done look like?"
                rows={3}
              />
            </label>
            <label>
              Ticket link <span>optional</span>
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://"
              />
            </label>
            <div className="dialog-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setFormOpen(false)}
              >
                Cancel
              </button>
              <button
                className="button primary"
                type="submit"
                disabled={!title.trim() || !clientId}
              >
                {editing ? "Save changes" : "Create task"}
                <ArrowUpRight size={16} />
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {pendingDelete && (
        <Dialog
          title="Delete this task?"
          onClose={() => setPendingDelete(null)}
        >
          <p className="dialog-description">
            “{pendingDelete.title}” and its subtasks will be removed. Existing
            time entries stay in your history.
          </p>
          <div className="dialog-actions">
            <button
              className="button secondary"
              onClick={() => setPendingDelete(null)}
            >
              Keep task
            </button>
            <button
              className="button destructive"
              onClick={() => {
                onDeleteTask(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Delete task
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
};
export default TaskBoard;
