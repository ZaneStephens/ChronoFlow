import GapActions from "./ui/GapActions";
import { durationLabel } from "../services/workspaceMetrics";
import { downloadDayCsv } from "../services/dayExport";
import React, { useState, useEffect, useRef } from "react";
import {
  TimerSession,
  Task,
  Client,
  Subtask,
  PlannedActivity,
  RecurringActivity,
} from "../types";
import {
  Download,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Calendar,
  Trash2,
  Repeat,
  PlusCircle,
  ZoomIn,
  ZoomOut,
  Pencil,
} from "lucide-react";

interface TimelineProps {
  sessions: TimerSession[];
  plannedActivities: PlannedActivity[];
  recurringActivities: RecurringActivity[];
  tasks: Task[];
  clients: Client[];
  subtasks: Subtask[];
  onAddPlan: (date: string, time: number, initialDuration?: number) => void;
  onToggleLog: (activityId: string) => void;
  onStartTimer: (
    taskId?: string,
    subtaskId?: string,
    startTimeOverride?: number,
  ) => void;
  onDeletePlan: (id: string) => void;
  onEditSession: (session: TimerSession) => void;
  onPreviewTask: (task: Task) => void;
  onManualEntry: (startTime: number, endTime: number) => void;
  onUpdatePlan: (planId: string, newStartTime: number) => void;
  onEditPlan: (plan: PlannedActivity) => void;
}

const Timeline: React.FC<TimelineProps> = ({
  sessions,
  plannedActivities,
  recurringActivities,
  tasks,
  clients,
  subtasks,
  onAddPlan,
  onToggleLog,
  onStartTimer,
  onDeletePlan,
  onEditSession,
  onPreviewTask,
  onManualEntry,
  onUpdatePlan,
  onEditPlan,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentTimeSydney, setCurrentTimeSydney] = useState("");
  const [gapMenu, setGapMenu] = useState<{
    session: TimerSession;
    anchor: HTMLButtonElement;
  } | null>(null);
  const [view, setView] = useState<"timeline" | "agenda">("timeline");
  const [query, setQuery] = useState("");
  useEffect(() => {
    setGapMenu(null);
  }, [selectedDate, view]);
  const [pixelsPerHour, setPixelsPerHour] = useState(120);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Drag State
  const [dragState, setDragState] = useState<{
    id: string;
    startY: number;
    startTime: number;
  } | null>(null);
  const [optimisticStartTime, setOptimisticStartTime] = useState<number | null>(
    null,
  );

  // Constants for Layout
  const START_HOUR = 6;
  const END_HOUR = 18;
  const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * pixelsPerHour;

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeString = new Intl.DateTimeFormat("en-AU", {
        timeZone: "Australia/Sydney",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(now);
      setCurrentTimeSydney(timeString);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);

    if (scrollContainerRef.current) {
      const now = new Date();
      const hours = now.getHours() + now.getMinutes() / 60;
      const scrollPos = (hours - START_HOUR) * pixelsPerHour - 100;
      scrollContainerRef.current.scrollTop = Math.max(0, scrollPos);
    }

    return () => clearInterval(timer);
  }, []);

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };
  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const handleZoomIn = () =>
    setPixelsPerHour((prev) => Math.min(prev + 20, 240));
  const handleZoomOut = () =>
    setPixelsPerHour((prev) => Math.max(prev - 20, 60));

  const formatDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const dateKey = formatDateKey(selectedDate);

  const dayStart = new Date(selectedDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(selectedDate);
  dayEnd.setHours(23, 59, 59, 999);

  // Filter manual plans for the date AND exclude those linked to completed tasks (unless logged)
  const manualPlans = plannedActivities.filter((p) => {
    if (p.date !== dateKey) return false;
    if (p.taskId) {
      const task = tasks.find((t) => t.id === p.taskId);
      // If task is completed and this plan hasn't been logged yet, hide it
      if (task && task.status === "done" && !p.isLogged) return false;
    }
    return true;
  });

  const ghostPlans: PlannedActivity[] = recurringActivities
    .map((rule) => {
      // Logic Fix: Check if task is completed
      if (rule.taskId) {
        const task = tasks.find((t) => t.id === rule.taskId);
        if (task && task.status === "done") return null;
      }

      let matches = false;
      const dayOfWeek = selectedDate.getDay();
      const dayOfMonth = selectedDate.getDate();

      if (rule.frequency === "daily") {
        if (dayOfWeek !== 0 && dayOfWeek !== 6) matches = true;
      }

      if (rule.frequency === "weekly" && rule.weekDays?.includes(dayOfWeek))
        matches = true;

      if (rule.frequency === "fortnightly" && rule.startDate) {
        const start = new Date(rule.startDate);
        if (
          dayStart.getTime() >= new Date(start.setHours(0, 0, 0, 0)).getTime()
        ) {
          const oneDay = 24 * 60 * 60 * 1000;
          const d1 = new Date(dateKey);
          const d2 = new Date(rule.startDate);
          const diffDays = Math.round((d1.getTime() - d2.getTime()) / oneDay);

          if (diffDays >= 0 && diffDays % 14 === 0) {
            matches = true;
          }
        }
      }

      if (rule.frequency === "monthly" && rule.monthDay === dayOfMonth)
        matches = true;

      if (rule.frequency === "monthly-nth") {
        if (rule.nthWeekDay === dayOfWeek) {
          const nth = Math.floor((dayOfMonth - 1) / 7) + 1;
          if (rule.nthWeek === nth) matches = true;
          if (rule.nthWeek === 5) {
            const nextWeek = new Date(selectedDate);
            nextWeek.setDate(dayOfMonth + 7);
            if (nextWeek.getMonth() !== selectedDate.getMonth()) matches = true;
          }
        }
      }

      if (!matches) return null;

      if (manualPlans.some((p) => p.recurringId === rule.id)) return null;

      const [h, m] = rule.startTimeStr.split(":").map(Number);
      const ghostStart = new Date(selectedDate);
      ghostStart.setHours(h, m, 0, 0);

      return {
        id: `ghost_${rule.id}_${dateKey}`,
        date: dateKey,
        startTime: ghostStart.getTime(),
        durationMinutes: rule.durationMinutes,
        type: rule.type,
        taskId: rule.taskId,
        clientId: rule.clientId,
        quickTitle: rule.quickTitle,
        isLogged: false,
        recurringId: rule.id,
      };
    })
    .filter(Boolean) as PlannedActivity[];

  const dayPlans = [...manualPlans, ...ghostPlans];

  const daySessions = sessions
    .filter(
      (s) =>
        s.startTime >= dayStart.getTime() && s.startTime <= dayEnd.getTime(),
    )
    .sort((a, b) => a.startTime - b.startTime);

  const getPosition = (startTime: number, endTime: number) => {
    const start = new Date(startTime);
    const end = new Date(endTime);

    const startHours = start.getHours() + start.getMinutes() / 60;
    const endHours = end.getHours() + end.getMinutes() / 60;

    const top = (startHours - START_HOUR) * pixelsPerHour;
    const height = (endHours - startHours) * pixelsPerHour;

    return { top, height };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState) return;

      const deltaY = e.clientY - dragState.startY;
      const deltaMinutes = (deltaY / pixelsPerHour) * 60;
      const deltaMs = deltaMinutes * 60 * 1000;

      let newStartTime = dragState.startTime + deltaMs;

      const snapMs = 15 * 60 * 1000;
      newStartTime = Math.round(newStartTime / snapMs) * snapMs;

      const dayStartBoundary = new Date(selectedDate);
      dayStartBoundary.setHours(START_HOUR, 0, 0, 0);

      const dayEndBoundary = new Date(selectedDate);
      dayEndBoundary.setHours(END_HOUR, 0, 0, 0);

      if (newStartTime < dayStartBoundary.getTime())
        newStartTime = dayStartBoundary.getTime();
      if (newStartTime > dayEndBoundary.getTime())
        newStartTime = dayEndBoundary.getTime();

      setOptimisticStartTime(newStartTime);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!dragState) return;

      if (
        optimisticStartTime !== null &&
        optimisticStartTime !== dragState.startTime
      ) {
        onUpdatePlan(dragState.id, optimisticStartTime);
      }

      setDragState(null);
      setOptimisticStartTime(null);
    };

    if (dragState) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    dragState,
    optimisticStartTime,
    pixelsPerHour,
    selectedDate,
    onUpdatePlan,
  ]);

  const handlePlanMouseDown = (e: React.MouseEvent, plan: PlannedActivity) => {
    if (plan.isLogged) return;
    e.stopPropagation();
    setDragState({
      id: plan.id,
      startY: e.clientY,
      startTime: plan.startTime,
    });
  };

  const getBusyRanges = () => {
    return [
      ...daySessions.map((s) => ({
        start: s.startTime,
        end: s.endTime || Date.now(),
      })),
      ...dayPlans.map((p) => ({
        start: p.startTime,
        end: p.startTime + p.durationMinutes * 60 * 1000,
      })),
    ].sort((a, b) => a.start - b.start);
  };

  const calculateSafeDuration = (
    startTime: number,
    maxDesiredMinutes: number = 30,
  ): number => {
    const busyRanges = getBusyRanges();
    const nextBusy = busyRanges.find((r) => r.start > startTime + 1000);
    const dayEndTime = new Date(selectedDate);
    dayEndTime.setHours(END_HOUR, 0, 0, 0);
    const limitTime = nextBusy ? nextBusy.start : dayEndTime.getTime();
    const availableMs = limitTime - startTime;
    const availableMinutes = Math.floor(availableMs / 60000);
    if (busyRanges.some((r) => r.start <= startTime && r.end > startTime))
      return 0;
    return Math.max(0, Math.min(maxDesiredMinutes, availableMinutes));
  };

  const calculateSafeStartBefore = (
    endTime: number,
    maxDesiredMinutes: number = 30,
  ): { start: number; duration: number } => {
    const busyRanges = getBusyRanges().sort((a, b) => a.end - b.end);
    const prevBusy = busyRanges.filter((r) => r.end <= endTime - 1000).pop();
    const dayStartTime = new Date(selectedDate);
    dayStartTime.setHours(START_HOUR, 0, 0, 0);
    const limitTime = prevBusy ? prevBusy.end : dayStartTime.getTime();
    const availableMs = endTime - limitTime;
    const availableMinutes = Math.floor(availableMs / 60000);
    const duration = busyRanges.some(
      (r) => r.start < endTime && r.end > endTime,
    )
      ? 0
      : Math.max(0, Math.min(maxDesiredMinutes, availableMinutes));
    const start = endTime - duration * 60 * 1000;
    return { start, duration };
  };

  const clampManualEntryRange = (startTime: number, endTime: number) => {
    const dayStartTime = new Date(selectedDate);
    dayStartTime.setHours(START_HOUR, 0, 0, 0);
    const dayEndTime = new Date(selectedDate);
    dayEndTime.setHours(END_HOUR, 0, 0, 0);

    const clampedStart = Math.max(startTime, dayStartTime.getTime());
    const clampedEnd = Math.min(endTime, dayEndTime.getTime());

    if (clampedEnd <= clampedStart) return null;
    return { start: clampedStart, end: clampedEnd };
  };

  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollContainerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const hoursFromStart = clickY / pixelsPerHour;
    const absoluteHours = START_HOUR + hoursFromStart;

    const clickedDate = new Date(selectedDate);
    clickedDate.setHours(Math.floor(absoluteHours));
    clickedDate.setMinutes(Math.floor((absoluteHours % 1) * 60));
    clickedDate.setSeconds(0);
    clickedDate.setMilliseconds(0);

    const safeDuration = calculateSafeDuration(clickedDate.getTime(), 30);
    if (safeDuration > 0)
      onAddPlan(dateKey, clickedDate.getTime(), safeDuration);
  };

  const now = new Date();
  const isToday = formatDateKey(now) === dateKey;
  const currentHours = now.getHours() + now.getMinutes() / 60;
  const currentTimeTop = (currentHours - START_HOUR) * pixelsPerHour;

  const handleExportCSV = () => {
    downloadDayCsv(dateKey, daySessions, tasks, clients, subtasks);
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const formatTime = (time: number) =>
    new Date(time).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  const sessionTitle = (session: TimerSession) => {
    const task = tasks.find((t) => t.id === session.taskId);
    const client = clients.find(
      (c) => c.id === (task?.clientId || session.clientId),
    );
    const subtask = subtasks.find((s) => s.id === session.subtaskId);
    const description =
      stripHtml(session.notes || "").trim() ||
      subtask?.title ||
      task?.title ||
      session.customTitle ||
      "Unallocated";
    return `${client?.name || "Unallocated"} - ${description}`;
  };
  const agendaSessions = daySessions.filter((session) => {
    const task = tasks.find((t) => t.id === session.taskId);
    return `${sessionTitle(session)} ${task?.title || ""} ${task?.ticketNumber || ""}`
      .toLowerCase()
      .includes(query.trim().toLowerCase());
  });
  const loggedSeconds = daySessions.reduce(
    (sum, s) =>
      sum + (s.endTime ? Math.max(0, s.endTime - s.startTime) / 1000 : 0),
    0,
  );

  return (
    <div
      id="timeline-view"
      className="flex flex-col h-[calc(100vh-6rem)] p-6 gap-4"
    >
      <div className="planner-heading">
        <div>
          <p className="eyebrow">A LITTLE INTENTION GOES A LONG WAY</p>
          <h1>Give your day a shape.</h1>
          <p>Plan what’s ahead. Capture what you’ve done.</p>
        </div>
        <div className="planner-quick-actions">
          <button
            className="button secondary"
            onClick={() => {
              const d = new Date(selectedDate);
              d.setHours(9, 0, 0, 0);
              onManualEntry(d.getTime(), d.getTime() + 30 * 60000);
            }}
          >
            <PlusCircle size={15} /> Log time
          </button>
          <button
            className="button primary"
            onClick={() => {
              const d = new Date(selectedDate);
              d.setHours(9, 0, 0, 0);
              onAddPlan(dateKey, d.getTime(), 30);
            }}
          >
            <Calendar size={15} /> Plan time
          </button>
        </div>
      </div>
      <div className="planner-tools">
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-canvas rounded-lg border border-line p-1">
            <button
              aria-label="Previous day"
              onClick={handlePrevDay}
              className="p-2 hover:bg-inset rounded-md text-muted hover:text-ink transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <input
              aria-label="Choose day"
              type="date"
              className="px-2 py-1 text-sm text-ink bg-transparent min-w-0"
              value={dateKey}
              onChange={(e) => {
                if (e.target.value)
                  setSelectedDate(new Date(e.target.value + "T12:00:00"));
              }}
            />
            <button
              aria-label="Next day"
              onClick={handleNextDay}
              className="p-2 hover:bg-inset rounded-md text-muted hover:text-ink transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <button
            onClick={() => setSelectedDate(new Date())}
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 underline"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-6 mt-4 md:mt-0">
          <div className="flex items-center bg-canvas rounded-lg border border-line p-1">
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-muted hover:text-ink hover:bg-inset rounded"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <div className="px-2 text-xs text-quiet font-mono select-none">
              Zoom
            </div>
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-muted hover:text-ink hover:bg-inset rounded"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
          </div>
          <div className="h-8 w-px bg-inset hidden md:block"></div>
          <div className="text-right hidden md:block">
            <p className="text-[10px] uppercase tracking-wider text-quiet font-bold">
              Sydney Time
            </p>
            <p className="text-lg font-mono font-bold text-ink">
              {currentTimeSydney}
            </p>
          </div>
          <div className="h-8 w-px bg-inset hidden md:block"></div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-ink rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-900/20"
          >
            <Download size={16} /> Export day CSV
          </button>
        </div>
      </div>

      <div className="day-review-tools">
        <div role="group" aria-label="Day view" className="day-view-switch">
          <button
            aria-pressed={view === "timeline"}
            onClick={() => setView("timeline")}
          >
            Timeline
          </button>
          <button
            aria-pressed={view === "agenda"}
            onClick={() => setView("agenda")}
          >
            Agenda
          </button>
        </div>
        <p>
          <strong>{durationLabel(loggedSeconds)}</strong> recorded ·{" "}
          {daySessions.length} entries ·{" "}
          {dayPlans.filter((p) => !p.isLogged).length} plans remaining
        </p>
      </div>
      {view === "agenda" ? (
        <section className="day-agenda" aria-label="Day entries">
          <label className="agenda-search">
            Find an entry
            <input
              type="search"
              placeholder="Client, description or ticket…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <p className="text-sm text-muted">
            {agendaSessions.length} of {daySessions.length} entries · CSV export
            always includes the whole day.
          </p>
          {agendaSessions.length === 0 && (
            <p className="agenda-empty">
              {daySessions.length
                ? "No matching entries. Try another search."
                : "No time recorded for this day. Use Log time to add an entry."}
            </p>
          )}
          {agendaSessions.map((session) => (
            <button
              key={session.id}
              className="agenda-entry"
              onClick={() => onEditSession(session)}
            >
              <span className="agenda-time">
                {formatTime(session.startTime)} –{" "}
                {session.endTime ? formatTime(session.endTime) : "Now"}
              </span>
              <strong>{sessionTitle(session)}</strong>
              <span>
                {session.endTime
                  ? durationLabel((session.endTime - session.startTime) / 1000)
                  : "Running"}
                <Pencil size={14} />
              </span>
            </button>
          ))}
        </section>
      ) : (
        <div className="flex-1 timeline-stage border border-line rounded-xl relative overflow-hidden flex flex-col">
          <div
            ref={scrollContainerRef}
            className="overflow-y-auto flex-1 relative"
          >
            <div className="absolute top-0 left-0 right-0 pointer-events-none z-0">
              {Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, i) => {
                const hour = START_HOUR + i;
                return (
                  <div
                    key={hour}
                    className="flex items-center border-b border-line/50 box-border absolute w-full"
                    style={{ top: i * pixelsPerHour, height: pixelsPerHour }}
                  >
                    <div
                      className="w-16 text-right pr-4 text-xs font-mono text-quiet"
                      style={{ marginTop: `-${pixelsPerHour - 16}px` }}
                    >
                      {hour > 12
                        ? `${hour - 12} PM`
                        : hour === 12
                          ? "12 PM"
                          : `${hour} AM`}
                    </div>
                    <div className="flex-1 border-t border-line/30"></div>
                  </div>
                );
              })}
            </div>

            <div
              className="relative ml-16"
              style={{ height: TOTAL_HEIGHT }}
              onClick={handleBackgroundClick}
            >
              {isToday &&
                currentHours >= START_HOUR &&
                currentHours <= END_HOUR && (
                  <div
                    className="absolute left-0 right-0 z-30 flex items-center pointer-events-none"
                    style={{ top: currentTimeTop }}
                  >
                    <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                    <div className="h-px bg-red-500 flex-1 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                  </div>
                )}

              {dayPlans.map((plan) => {
                const isDragging = dragState?.id === plan.id;
                const startTime =
                  isDragging && optimisticStartTime
                    ? optimisticStartTime
                    : plan.startTime;
                const endTime = startTime + plan.durationMinutes * 60 * 1000;
                const { top, height } = getPosition(startTime, endTime);

                if (top < 0 || top > TOTAL_HEIGHT) return null;

                const task = plan.taskId
                  ? tasks.find((t) => t.id === plan.taskId)
                  : null;
                let client = task
                  ? clients.find((c) => c.id === task.clientId)
                  : null;
                if (!client && plan.clientId)
                  client = clients.find((c) => c.id === plan.clientId) || null;
                const isGhost = plan.id.startsWith("ghost_");

                return (
                  <div
                    key={plan.id}
                    onMouseDown={(e) => handlePlanMouseDown(e, plan)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (plan.type === "task" && task && !isGhost)
                        onPreviewTask(task);
                    }}
                    className={`absolute left-2 right-2 md:right-1/2 rounded-lg border-2 px-2 py-1 transition-all group z-10 flex flex-col overflow-hidden hover:z-50 hover:bg-surface ${
                      plan.isLogged
                        ? "border-dashed border-emerald-500/30 bg-emerald-500/5 opacity-60 cursor-default"
                        : isDragging
                          ? "border-solid border-indigo-400 bg-surface shadow-xl z-50 scale-[1.02] cursor-move"
                          : isGhost
                            ? "border-dashed border-indigo-500/50 bg-indigo-500/10 hover:border-indigo-400 cursor-move"
                            : "border-dashed border-line bg-surface/40 hover:border-indigo-400 cursor-move"
                    }`}
                    style={{ top, height: Math.max(height, 40) }}
                  >
                    <div className="flex justify-between items-start pointer-events-none">
                      <div className="min-w-0">
                        <h4
                          className={`text-sm font-medium truncate ${plan.isLogged ? "line-through text-quiet" : "text-ink"}`}
                        >
                          {client?.name || "Unallocated"} -{" "}
                          {plan.type === "task"
                            ? task?.title || "Untitled task"
                            : plan.quickTitle || "Planned activity"}
                        </h4>
                        <div className="flex items-center gap-2">
                          {plan.type === "quick" && !client ? (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1 rounded uppercase font-bold">
                              Quick
                            </span>
                          ) : (
                            <span
                              className="text-[10px] bg-inset text-body px-1 rounded uppercase font-bold"
                              style={{ color: client?.color }}
                            >
                              {client?.name}
                            </span>
                          )}
                          <span className="text-xs text-muted font-mono">
                            {new Date(startTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {isGhost && (
                            <span
                              className="text-indigo-400"
                              title="Recurring Activity"
                            >
                              <Repeat size={12} />
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity bg-canvas/80 rounded p-1 pointer-events-auto">
                        {!plan.isLogged && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditPlan(plan);
                            }}
                            className="p-1 text-muted hover:text-ink"
                            title="Edit Plan"
                          >
                            <Pencil size={16} />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleLog(plan.id);
                          }}
                          className={`p-1 rounded ${plan.isLogged ? "text-emerald-400" : "text-muted hover:text-ink"}`}
                          title={
                            plan.isLogged
                              ? "Mark as not logged"
                              : "Log as completed"
                          }
                        >
                          {plan.isLogged ? (
                            <CheckSquare size={16} />
                          ) : (
                            <Square size={16} />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeletePlan(plan.id);
                          }}
                          className="p-1 text-muted hover:text-red-400"
                          title={
                            isGhost ? "Delete Recurring Rule" : "Delete Plan"
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {daySessions.map((session, index) => {
                const duration =
                  (session.endTime || Date.now()) - session.startTime;
                const displayEndTime = session.endTime || Date.now();
                const { top, height } = getPosition(
                  session.startTime,
                  displayEndTime,
                );

                if (top < 0) return null;

                const task = session.taskId
                  ? tasks.find((t) => t.id === session.taskId)
                  : null;
                let client = task
                  ? clients.find((c) => c.id === task.clientId)
                  : null;
                if (!client && session.clientId)
                  client =
                    clients.find((c) => c.id === session.clientId) || null;
                const isSmall = height < 40;
                const GAP_THRESHOLD = 5 * 60 * 1000;
                const prevSession = index > 0 ? daySessions[index - 1] : null;
                const nextSession =
                  index < daySessions.length - 1
                    ? daySessions[index + 1]
                    : null;
                const hasGapBefore =
                  !prevSession ||
                  session.startTime -
                    Math.max(
                      ...daySessions
                        .slice(0, index)
                        .map((s) => s.endTime || Date.now()),
                    ) >
                    GAP_THRESHOLD;
                const hasGapAfter =
                  (!nextSession ||
                    nextSession.startTime - displayEndTime > GAP_THRESHOLD) &&
                  !daySessions.some(
                    (s) =>
                      s.id !== session.id &&
                      s.startTime <= displayEndTime &&
                      (s.endTime || Date.now()) > displayEndTime,
                  );

                return (
                  <div
                    key={session.id}
                    className="absolute left-6 right-6 md:left-[52%] md:right-4 group z-20"
                    style={{ top, height: Math.max(height, 24) }}
                  >
                    {hasGapBefore && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const { start, duration } = calculateSafeStartBefore(
                            session.startTime,
                            30,
                          );
                          const clamped = clampManualEntryRange(
                            start,
                            start + duration * 60 * 1000,
                          );
                          if (clamped)
                            onManualEntry(clamped.start, clamped.end);
                        }}
                        className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 w-6 h-6 bg-inset hover:bg-indigo-600 rounded-full text-ink shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity transform hover:scale-110"
                        title="Fill gap before (Manual Entry)"
                      >
                        <PlusCircle size={14} />
                      </button>
                    )}

                    {hasGapAfter && (
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-30">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setGapMenu(
                              gapMenu?.session.id === session.id
                                ? null
                                : { session, anchor: e.currentTarget },
                            );
                          }}
                          className="w-6 h-6 bg-inset hover:bg-emerald-600 rounded-full text-ink shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity transform hover:scale-110"
                          title="Fill gap after"
                          aria-expanded={gapMenu?.session.id === session.id}
                          aria-controls={
                            gapMenu?.session.id === session.id
                              ? "gap-actions"
                              : undefined
                          }
                        >
                          <PlusCircle size={14} />
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditSession(session);
                      }}
                      className={`session-card ${isSmall ? "compact" : ""}`}
                      style={{ borderColor: client?.color || "#53744b" }}
                      title={`${sessionTitle(session)} • ${formatTime(session.startTime)} – ${session.endTime ? formatTime(session.endTime) : "Now"}`}
                      aria-label={`Edit time entry: ${sessionTitle(session)}`}
                    >
                      <strong>{sessionTitle(session)}</strong>
                      {!isSmall && (
                        <span className="session-meta">
                          {formatTime(session.startTime)} –{" "}
                          {session.endTime
                            ? formatTime(session.endTime)
                            : "Now"}{" "}
                          · {durationLabel(duration / 1000)}
                          {session.isManualLog ? " · Manual" : ""}
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {gapMenu && (
        <GapActions
          anchor={gapMenu.anchor}
          onClose={() => setGapMenu(null)}
          onStart={
            isToday &&
            !!gapMenu.session.endTime &&
            gapMenu.session.endTime <= Date.now() &&
            !sessions.some(
              (s) =>
                s.id !== gapMenu.session.id &&
                (s.endTime || Date.now()) > gapMenu.session.endTime!,
            )
              ? () =>
                  onStartTimer(undefined, undefined, gapMenu.session.endTime)
              : undefined
          }
          onLog={() => {
            const start = gapMenu.session.endTime || Date.now();
            const duration = calculateSafeDuration(start, 30);
            const range = clampManualEntryRange(
              start,
              start + duration * 60000,
            );
            if (range) onManualEntry(range.start, range.end);
          }}
        />
      )}
    </div>
  );
};

export default Timeline;
