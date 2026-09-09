import ClientOptions from "./ui/ClientOptions";
import Dialog from "./ui/Dialog";
import React, { useState, useEffect, useMemo } from "react";
import {
  Task,
  Client,
  RecurringActivity,
  RecurrenceFrequency,
  PlannedActivity,
} from "../types";
import {
  X,
  CalendarPlus,
  Zap,
  CheckSquare,
  Repeat,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  onDeleteRule?: (id: string) => void;
  tasks: Task[];
  clients: Client[];
  recurringActivities?: RecurringActivity[];
  initialTime?: number;
  initialDuration?: number;
  editingPlan?: PlannedActivity | null;
}

const PlanModal: React.FC<PlanModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDeleteRule,
  tasks,
  clients,
  recurringActivities = [],
  initialTime,
  initialDuration,
  editingPlan,
}) => {
  const [tab, setTab] = useState<"one-off" | "recurring">("one-off");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Shared
  const [type, setType] = useState<"task" | "quick">("task");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [quickTitle, setQuickTitle] = useState("");
  const [quickClientId, setQuickClientId] = useState("");
  const [duration, setDuration] = useState(30);
  const [filterClient, setFilterClient] = useState("all");
  const [timeStr, setTimeStr] = useState("");

  // Recurring Specific
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("daily");
  const [weekDays, setWeekDays] = useState<number[]>([]); // 1=Mon ...
  const [monthDay, setMonthDay] = useState<number>(1);
  const [nthWeek, setNthWeek] = useState<number>(1);
  const [nthWeekDay, setNthWeekDay] = useState<number>(1); // 1=Mon

  useEffect(() => {
    if (isOpen) {
      if (editingPlan) {
        // EDIT MODE
        setTab("one-off"); // Editing an instance is treated as one-off modification
        setType(editingPlan.type);

        if (editingPlan.type === "task") {
          setSelectedTaskId(editingPlan.taskId || "");
        } else {
          setQuickTitle(editingPlan.quickTitle || "");
          setQuickClientId(editingPlan.clientId || "");
        }

        setDuration(editingPlan.durationMinutes);

        const d = new Date(editingPlan.startTime);
        const h = d.getHours().toString().padStart(2, "0");
        const m = d.getMinutes().toString().padStart(2, "0");
        setTimeStr(`${h}:${m}`);
      } else {
        // CREATE MODE
        setTab("one-off");
        setType("task");
        setQuickTitle("");
        setQuickClientId("");
        setDuration(initialDuration || 30);
        setFilterClient("all");
        setFrequency("daily");
        setWeekDays([1, 2, 3, 4, 5]); // Mon-Fri default
        setMonthDay(1);
        setNthWeek(1);
        setNthWeekDay(1); // Mon

        if (initialTime) {
          const d = new Date(initialTime);
          const h = d.getHours().toString().padStart(2, "0");
          const m = d.getMinutes().toString().padStart(2, "0");
          setTimeStr(`${h}:${m}`);
        } else {
          const now = new Date();
          const h = now.getHours().toString().padStart(2, "0");
          const m = now.getMinutes().toString().padStart(2, "0");
          setTimeStr(`${h}:${m}`);
        }
      }
    }
  }, [isOpen, initialTime, initialDuration, editingPlan]);

  // Filter tasks based on client selection AND exclude completed tasks
  const filteredTasks = useMemo(() => {
    let result = tasks.filter((t) => t.status !== "done"); // Exclude completed
    if (filterClient !== "all") {
      result = result.filter((t) => t.clientId === filterClient);
    }
    return result;
  }, [tasks, filterClient]);

  // Auto-select the first task if not editing
  useEffect(() => {
    if (type === "task" && isOpen && !editingPlan) {
      const isValid = filteredTasks.some((t) => t.id === selectedTaskId);
      if (!selectedTaskId || !isValid) {
        if (filteredTasks.length > 0) {
          setSelectedTaskId(filteredTasks[0].id);
        } else {
          setSelectedTaskId("");
        }
      }
    }
  }, [filteredTasks, type, isOpen, selectedTaskId, editingPlan]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (type === "task" && !selectedTaskId) return;
    if (type === "quick" && !quickTitle) return;
    if (!timeStr) return;

    if (tab === "one-off") {
      const [h, m] = timeStr.split(":").map(Number);
      const baseDate = editingPlan
        ? new Date(editingPlan.startTime)
        : initialTime
          ? new Date(initialTime)
          : new Date();
      baseDate.setHours(h, m, 0, 0);

      onSave({
        isRecurring: false,
        type,
        taskId: type === "task" ? selectedTaskId : undefined,
        clientId: type === "quick" && quickClientId ? quickClientId : undefined,
        quickTitle: type === "quick" ? quickTitle : undefined,
        duration,
        startTime: baseDate.getTime(),
      });
    } else {
      // Calculate start date for recurrence anchor
      const d = initialTime ? new Date(initialTime) : new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const startDateStr = `${y}-${m}-${day}`;

      const rule: Partial<RecurringActivity> = {
        type,
        taskId: type === "task" ? selectedTaskId : undefined,
        clientId: type === "quick" && quickClientId ? quickClientId : undefined,
        quickTitle: type === "quick" ? quickTitle : undefined,
        startTimeStr: timeStr,
        durationMinutes: duration,
        frequency,
        startDate: startDateStr,
      };

      if (frequency === "weekly") rule.weekDays = weekDays;
      if (frequency === "monthly") rule.monthDay = monthDay;
      if (frequency === "monthly-nth") {
        rule.nthWeek = nthWeek;
        rule.nthWeekDay = nthWeekDay;
      }

      onSave({
        isRecurring: true,
        recurringRule: rule,
      });
    }

    onClose();
  };

  const toggleWeekDay = (d: number) => {
    if (weekDays.includes(d)) setWeekDays(weekDays.filter((day) => day !== d));
    else setWeekDays([...weekDays, d]);
  };

  const getDayName = (d: number) =>
    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d];

  return (
    <Dialog
      title={
        editingPlan
          ? "Make a little adjustment."
          : "Make room for what matters."
      }
      onClose={onClose}
      className="planner-dialog"
    >
      <div className="planner-dialog-body flex flex-col md:flex-row overflow-hidden border border-line rounded-lg mt-6">
        {/* Sidebar for Recurring Rules List */}
        <div
          className={`transition-all duration-300 border-r border-line flex flex-col bg-canvas/50 ${isSidebarOpen ? "w-full md:w-72 max-h-[300px] md:max-h-full shrink-0" : "w-0 hidden md:flex md:w-12"} relative`}
        >
          <div className="p-4 border-b border-line flex justify-between items-center h-16 shrink-0 bg-canvas">
            {isSidebarOpen && (
              <h4 className="text-xs font-bold text-quiet uppercase tracking-wider whitespace-nowrap">
                Active Rules
              </h4>
            )}
            <button
              aria-label={
                isSidebarOpen ? "Hide recurring rules" : "Show recurring rules"
              }
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1 hover:bg-inset rounded text-muted hover:text-ink mx-auto md:mx-0"
            >
              {isSidebarOpen ? (
                <ChevronLeft size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
          </div>

          {isSidebarOpen && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {recurringActivities.map((rule) => {
                const task = rule.taskId
                  ? tasks.find((t) => t.id === rule.taskId)
                  : null;
                const title =
                  rule.type === "task" ? task?.title : rule.quickTitle;

                let freqText: string = rule.frequency;
                if (rule.frequency === "daily") freqText = "Daily (M-F)";
                if (rule.frequency === "weekly") freqText = "Weekly";
                if (rule.frequency === "fortnightly") freqText = "Fortnightly";
                if (rule.frequency === "monthly") freqText = "Monthly";
                if (rule.frequency === "monthly-nth")
                  freqText = "Monthly (Nth)";

                return (
                  <div
                    key={rule.id}
                    className="bg-surface p-3 rounded-lg border border-line group hover:border-indigo-500/50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-bold uppercase">
                        {freqText}
                      </span>
                      {onDeleteRule && (
                        <button
                          onClick={() => onDeleteRule(rule.id)}
                          className="text-quiet hover:text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <p
                      className="text-sm font-medium text-ink truncate mb-1"
                      title={title}
                    >
                      {title}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-quiet">
                      <span className="font-mono text-muted">
                        {rule.startTimeStr}
                      </span>
                      <span>•</span>
                      <span>{rule.durationMinutes}m</span>
                    </div>
                  </div>
                );
              })}
              {recurringActivities.length === 0 && (
                <p className="text-xs text-quiet text-center py-4">
                  No recurring rules active.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Main Form Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* Tabs - Hide if Editing an Instance */}
            {!editingPlan && (
              <div className="flex border-b border-line mb-6">
                <button
                  onClick={() => setTab("one-off")}
                  className={`pb-3 px-4 text-sm font-medium transition-colors relative ${
                    tab === "one-off"
                      ? "text-indigo-400"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  One-Off Activity
                  {tab === "one-off" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"></div>
                  )}
                </button>
                <button
                  onClick={() => setTab("recurring")}
                  className={`pb-3 px-4 text-sm font-medium transition-colors relative ${
                    tab === "recurring"
                      ? "text-indigo-400"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  Recurring Rule
                  {tab === "recurring" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"></div>
                  )}
                </button>
              </div>
            )}

            {/* Common: Task vs Quick */}
            <div className="flex bg-canvas p-1 rounded-lg border border-line">
              <button
                onClick={() => setType("task")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                  type === "task"
                    ? "bg-indigo-600 text-ink shadow-md"
                    : "text-muted hover:text-ink"
                }`}
              >
                <CheckSquare size={16} /> Existing Task
              </button>
              <button
                onClick={() => setType("quick")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                  type === "quick"
                    ? "bg-emerald-600 text-ink shadow-md"
                    : "text-muted hover:text-ink"
                }`}
              >
                <Zap size={16} /> Quick Entry
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Start Time Input */}
              <div>
                <label className="block text-sm font-medium text-muted mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={timeStr}
                  onChange={(e) => setTimeStr(e.target.value)}
                  className="bg-canvas border border-line rounded-lg px-3 py-2 text-ink focus:ring-2 focus:ring-indigo-500 outline-none w-full"
                />
              </div>
              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-muted mb-1">
                  Duration
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="5"
                    max="480"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    className="bg-canvas border border-line rounded-lg px-3 py-2 text-ink focus:ring-2 focus:ring-indigo-500 outline-none w-full"
                  />
                  <span className="text-quiet text-sm">min</span>
                </div>
              </div>
            </div>

            {/* Recurring Logic Configuration */}
            {tab === "recurring" && !editingPlan && (
              <div className="bg-canvas/50 p-4 rounded-lg border border-line space-y-4">
                <h4 className="text-sm font-bold text-ink flex items-center gap-2">
                  <Repeat size={16} className="text-indigo-400" />
                  Recurrence Pattern
                </h4>

                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      "daily",
                      "weekly",
                      "fortnightly",
                      "monthly",
                      "monthly-nth",
                    ] as RecurrenceFrequency[]
                  ).map((freq) => (
                    <button
                      key={freq}
                      onClick={() => setFrequency(freq)}
                      className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors capitalize ${
                        frequency === freq
                          ? "bg-indigo-600 border-indigo-500 text-ink"
                          : "bg-surface border-line text-muted hover:text-ink"
                      }`}
                    >
                      {freq === "monthly-nth"
                        ? "Nth Weekday"
                        : freq === "daily"
                          ? "Daily (Mon-Fri)"
                          : freq}
                    </button>
                  ))}
                </div>

                {frequency === "weekly" && (
                  <div>
                    <label className="block text-xs font-medium text-muted mb-2 uppercase">
                      Repeat On
                    </label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                        <button
                          key={d}
                          onClick={() => toggleWeekDay(d)}
                          className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                            weekDays.includes(d)
                              ? "bg-indigo-500 text-ink ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900"
                              : "bg-surface text-quiet hover:bg-inset"
                          }`}
                        >
                          {getDayName(d).charAt(0)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {frequency === "fortnightly" && (
                  <div className="text-sm text-muted italic">
                    Repeats every 2 weeks starting from{" "}
                    {initialTime
                      ? new Date(initialTime).toLocaleDateString()
                      : new Date().toLocaleDateString()}
                    .
                  </div>
                )}

                {frequency === "monthly" && (
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-muted">On Day</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={monthDay}
                      onChange={(e) => setMonthDay(parseInt(e.target.value))}
                      className="w-16 bg-surface border border-line rounded px-2 py-1 text-ink text-center"
                    />
                    <span className="text-sm text-muted">of the month</span>
                  </div>
                )}

                {frequency === "monthly-nth" && (
                  <div className="flex items-center gap-2 flex-wrap text-sm text-muted">
                    <span>On the</span>
                    <select
                      value={nthWeek}
                      onChange={(e) => setNthWeek(parseInt(e.target.value))}
                      className="bg-surface border border-line rounded px-2 py-1 text-ink"
                    >
                      <option value={1}>1st</option>
                      <option value={2}>2nd</option>
                      <option value={3}>3rd</option>
                      <option value={4}>4th</option>
                      <option value={5}>Last</option>
                    </select>
                    <select
                      value={nthWeekDay}
                      onChange={(e) => setNthWeekDay(parseInt(e.target.value))}
                      className="bg-surface border border-line rounded px-2 py-1 text-ink"
                    >
                      {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                        <option key={d} value={d}>
                          {getDayName(d)}
                        </option>
                      ))}
                    </select>
                    <span>of the month</span>
                  </div>
                )}
              </div>
            )}

            {type === "task" ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1 uppercase tracking-wider">
                    Filter by Client
                  </label>
                  <select
                    aria-label="Filter planned tasks by client"
                    value={filterClient}
                    onChange={(e) => setFilterClient(e.target.value)}
                    className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-ink"
                  >
                    <option value="all">All clients</option>
                    <ClientOptions clients={clients} />
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted mb-1">
                    Select Task
                  </label>
                  <select
                    value={selectedTaskId}
                    onChange={(e) => setSelectedTaskId(e.target.value)}
                    className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-ink focus:ring-2 focus:ring-indigo-500 outline-none"
                    size={4}
                  >
                    {filteredTasks.map((t) => (
                      <option
                        key={t.id}
                        value={t.id}
                        className="py-1 px-2 rounded hover:bg-surface"
                      >
                        {t.title}
                      </option>
                    ))}
                    {filteredTasks.length === 0 && (
                      <option disabled className="p-2 text-quiet">
                        No active tasks found for this client
                      </option>
                    )}
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">
                    Title / Note
                  </label>
                  <input
                    type="text"
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    placeholder="e.g. Client Meeting, Lunch, Admin"
                    autoFocus
                    className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-ink focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted mb-1">
                    Client (Optional)
                  </label>
                  <select
                    value={quickClientId}
                    onChange={(e) => setQuickClientId(e.target.value)}
                    className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-ink focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">-- No Client / Internal --</option>
                    <ClientOptions clients={clients} />
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-canvas/50 border-t border-line flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              {!timeStr && (
                <span className="text-xs text-amber-400">* Time required</span>
              )}
              {type === "task" && !selectedTaskId && timeStr && (
                <span className="text-xs text-amber-400">* Select a task</span>
              )}
              {type === "quick" && !quickTitle && timeStr && (
                <span className="text-xs text-amber-400">* Enter a title</span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-body hover:text-ink hover:bg-inset rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={
                  !timeStr ||
                  (type === "task" && !selectedTaskId) ||
                  (type === "quick" && !quickTitle)
                }
                className={`px-6 py-2 text-ink font-medium rounded-lg shadow-lg flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                  type === "task"
                    ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-900/20"
                    : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20"
                }`}
              >
                {editingPlan ? <Edit2 size={18} /> : <CalendarPlus size={18} />}
                {editingPlan
                  ? "Update Plan"
                  : tab === "recurring"
                    ? "Create Rule"
                    : "Add Plan"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default PlanModal;
