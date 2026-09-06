import React, { useEffect, useState } from "react";
import {
  Task,
  TimerSession,
  Client,
  ActiveTimer,
  Project,
  PlannedActivity,
  ViewMode,
} from "../types";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock3,
  Plus,
  Play,
  Square,
  Target,
  Timer,
  CheckCircle2,
} from "lucide-react";
import {
  dayBounds,
  durationLabel,
  sessionSecondsInRange,
} from "../services/workspaceMetrics";

interface DashboardProps {
  tasks: Task[];
  clients: Client[];
  projects: Project[];
  sessions: TimerSession[];
  activeTimer: ActiveTimer | null;
  plannedActivities: PlannedActivity[];
  onStartTimer: (taskId?: string) => void;
  onStopTimer: () => void;
  onNavigate: (view: ViewMode) => void;
  onEditSession: (session: TimerSession) => void;
  onManualEntry: () => void;
  onPlan: () => void;
  onCompleteTask: (task: Task) => void;
}
const Dashboard: React.FC<DashboardProps> = ({
  tasks,
  clients,
  projects,
  sessions,
  activeTimer,
  plannedActivities,
  onStartTimer,
  onStopTimer,
  onNavigate,
  onEditSession,
  onManualEntry,
  onPlan,
  onCompleteTask,
}) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const [start, end] = dayBounds(now);
  const todaySessions = sessions
    .filter((s) => s.startTime >= start && s.startTime < end && s.endTime)
    .sort((a, b) => b.startTime - a.startTime);
  const logged = sessionSecondsInRange(sessions, start, end);
  const running = activeTimer
    ? Math.max(0, (now - Math.max(activeTimer.startTime, start)) / 1000)
    : 0;
  const total = logged + running;
  const goal = 7.6 * 3600;
  const openTasks = tasks
    .filter((t) => t.status !== "done")
    .sort(
      (a, b) =>
        Number(b.status === "in-progress") -
          Number(a.status === "in-progress") || b.createdAt - a.createdAt,
    );
  const currentTask = tasks.find((t) => t.id === activeTimer?.taskId);
  const todayPlans = plannedActivities
    .filter((p) => p.startTime >= start && p.startTime < end && !p.isLogged)
    .sort((a, b) => a.startTime - b.startTime);
  const clientTime = clients
    .map((client) => ({
      client,
      seconds: sessionSecondsInRange(
        sessions.filter(
          (s) =>
            (tasks.find((t) => t.id === s.taskId)?.clientId || s.clientId) ===
            client.id,
        ),
        start,
        end,
      ),
    }))
    .filter((x) => x.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds);
  const clientSeconds = clientTime
    .filter((x) => !x.client.isInternal)
    .reduce((sum, x) => sum + x.seconds, 0);
  const activeProjects = projects.filter((p) => p.status !== "completed");
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start);
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7) + i);
    const [a, b] = dayBounds(date.getTime());
    return { start: a, hours: sessionSecondsInRange(sessions, a, b) / 3600 };
  });
  const maxWeekHours = Math.max(7.6, ...week.map((day) => day.hours));
  const greeting =
    new Date(now).getHours() < 12
      ? "Good morning."
      : new Date(now).getHours() < 17
        ? "Good afternoon."
        : "Good evening.";
  return (
    <div className="workspace-page overview-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR WORK, AT A GLANCE</p>
          <h1>
            {greeting} <span>Make today count.</span>
          </h1>
          <p>A clear head starts with a clear view of your day.</p>
        </div>
        <button className="button secondary" onClick={onPlan}>
          <CalendarDays size={17} /> Plan my day
        </button>
      </div>
      <section className="day-banner" aria-label="Daily time goal">
        <div className="day-banner-copy">
          <span className="eyebrow">TODAY’S MOMENTUM</span>
          <div className="daily-total">
            {durationLabel(total)}
            <span> / 7h 36m</span>
          </div>
          <p>
            {total >= goal
              ? "Daily goal reached. That’s good work."
              : `${durationLabel(goal - total)} left to reach your daily goal.`}
          </p>
        </div>
        <div className="day-banner-progress">
          <div className="progress-heading">
            <span>Every little block adds up.</span>
            <strong>{Math.round((total / goal) * 100)}%</strong>
          </div>
          <div
            className="day-progress"
            role="progressbar"
            aria-label="Daily time goal"
            aria-valuenow={Math.min(100, Math.round((total / goal) * 100))}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span
              style={{ width: `${Math.min(100, (total / goal) * 100)}%` }}
            />
          </div>
          <div className="progress-key">
            <span>
              <i /> Logged time <b>{durationLabel(logged)}</b>
            </span>
            {activeTimer && (
              <span>
                Running <b>{durationLabel(running)}</b>
              </span>
            )}
            <span>6-minute billing blocks</span>
          </div>
        </div>
      </section>
      <div className="stat-strip">
        <div>
          <span>
            <Clock3 size={16} /> Client work today
          </span>
          <strong>{durationLabel(clientSeconds)}</strong>
          <small>
            {clientTime.filter((x) => !x.client.isInternal).length} clients
            supported
          </small>
        </div>
        <div>
          <span>
            <CheckCircle2 size={16} /> Open tasks
          </span>
          <strong>
            {openTasks.length}
            <small>to move forward</small>
          </strong>
          <small>
            {tasks.filter((t) => t.status === "in-progress").length} in progress
          </small>
        </div>
        <div>
          <span>
            <Target size={16} /> Active projects
          </span>
          <strong>
            {activeProjects.length}
            <small>in your workspace</small>
          </strong>
          <small>
            {
              activeProjects.filter(
                (p) =>
                  p.dueDate &&
                  new Date(p.dueDate + "T23:59:59").getTime() < now,
              ).length
            }{" "}
            past due date
          </small>
        </div>
      </div>
      <div className="overview-columns">
        <div className="overview-primary">
          <section className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">ONE THING AT A TIME</p>
                <h2>Up next</h2>
              </div>
              <button
                className="text-button"
                onClick={() => onNavigate(ViewMode.TASKS)}
              >
                All tasks <ArrowUpRight size={16} />
              </button>
            </div>
            <div className="priority-list">
              {openTasks.slice(0, 4).map((task) => {
                const client = clients.find((c) => c.id === task.clientId);
                const isRunning = activeTimer?.taskId === task.id;
                return (
                  <div className="priority-row" key={task.id}>
                    <button
                      className="complete-control"
                      aria-label={`Complete ${task.title}`}
                      onClick={() =>
                        onCompleteTask({ ...task, status: "done" })
                      }
                    >
                      <Check size={15} />
                    </button>
                    <div className="row-copy">
                      <strong>{task.title}</strong>
                      <span>
                        <i
                          className="client-dot"
                          style={{ background: client?.color || "#768879" }}
                        />
                        {client?.name || "Unassigned"}
                        {task.ticketNumber && ` · #${task.ticketNumber}`}
                      </span>
                    </div>
                    <span className={`status-pill ${task.status}`}>
                      {task.status === "in-progress" ? "In progress" : "To do"}
                    </span>
                    <button
                      className={`icon-button ${isRunning ? "running" : ""}`}
                      aria-label={`${isRunning ? "Stop" : "Start"} ${task.title}`}
                      onClick={() =>
                        isRunning ? onStopTimer() : onStartTimer(task.id)
                      }
                    >
                      {isRunning ? <Square size={16} /> : <Play size={16} />}
                    </button>
                  </div>
                );
              })}
              {!openTasks.length && (
                <div className="empty-state">
                  <CheckCircle2 size={28} />
                  <h3>A little room to breathe.</h3>
                  <p>Add a task to give your next block of time a purpose.</p>
                  <button
                    className="button secondary"
                    onClick={() => onNavigate(ViewMode.TASKS)}
                  >
                    <Plus size={16} /> Add your first task
                  </button>
                </div>
              )}
            </div>
          </section>
          <section className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">THE WORK YOU’VE PUT IN</p>
                <h2>
                  Today’s activity{" "}
                  <span className="count-badge">{todaySessions.length}</span>
                </h2>
              </div>
              <button className="text-button" onClick={onManualEntry}>
                <Plus size={16} /> Log time
              </button>
            </div>
            {todaySessions.length ? (
              <div className="activity-list">
                {todaySessions.slice(0, 5).map((s) => {
                  const task = tasks.find((t) => t.id === s.taskId);
                  const client = clients.find(
                    (c) => c.id === (task?.clientId || s.clientId),
                  );
                  return (
                    <button
                      className="activity-row"
                      key={s.id}
                      onClick={() => onEditSession(s)}
                    >
                      <span className="activity-time">
                        {new Date(s.startTime).toLocaleTimeString("en-AU", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </span>
                      <span
                        className="activity-marker"
                        style={{ background: client?.color || "#a9b6a9" }}
                      />
                      <span className="row-copy">
                        <strong>
                          {s.customTitle || task?.title || "Quick entry"}
                        </strong>
                        <span>
                          {client?.name || "Unassigned"}
                          {s.isManualLog
                            ? " · Manual entry"
                            : " · Tracked session"}
                        </span>
                      </span>
                      <span className="duration-text">
                        {durationLabel((s.endTime! - s.startTime) / 1000)}
                      </span>
                      <ArrowUpRight size={15} />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state compact">
                <Clock3 size={25} />
                <h3>Your day is a blank page.</h3>
                <p>Start a timer or log work you’ve already done.</p>
              </div>
            )}
            <button
              className="panel-footer"
              onClick={() => onNavigate(ViewMode.TIMELINE)}
            >
              Open your full day <ArrowRight size={16} />
            </button>
          </section>
        </div>
        <div className="overview-secondary">
          <section className={`timer-card ${activeTimer ? "is-running" : ""}`}>
            <div className="timer-card-top">
              <Timer size={21} />
              <span>{activeTimer ? "IN YOUR FLOW" : "FIND YOUR FLOW"}</span>
              {activeTimer && <span className="live-dot" />}
            </div>
            <h2>
              {activeTimer
                ? currentTask?.title || "A moment of focused work"
                : "Ready when you are."}
            </h2>
            <p>
              {activeTimer
                ? "One task. Your full attention."
                : "Give your next task a little undivided attention."}
            </p>
            {activeTimer && (
              <div className="mini-clock">{durationLabel(running)}</div>
            )}
            <button
              className="button timer-action"
              onClick={() => (activeTimer ? onStopTimer() : onStartTimer())}
            >
              {activeTimer ? <Square size={15} /> : <Play size={15} />}
              {activeTimer ? "Finish session" : "Start a timer"}
            </button>
            <button
              className="timer-focus"
              onClick={() => onNavigate(ViewMode.FOCUS)}
            >
              Enter focus space <ArrowUpRight size={14} />
            </button>
          </section>
          <section className="panel week-panel">
            <div className="section-heading">
              <h2>This week</h2>
              <span className="muted">Logged hours</span>
            </div>
            <div
              className="week-bars"
              role="img"
              aria-label="Logged hours for each day this week"
            >
              {week.map((day, i) => (
                <div
                  className={`week-day ${day.start === start ? "today" : ""}`}
                  key={i}
                >
                  <span>{day.hours ? day.hours.toFixed(1) : "—"}</span>
                  <div className="week-bar-track">
                    <div
                      style={{ height: `${(day.hours / maxWeekHours) * 100}%` }}
                    />
                  </div>
                  <span>{["M", "T", "W", "T", "F", "S", "S"][i]}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="panel distribution-panel">
            <div className="section-heading">
              <h2>Where time went</h2>
              <span className="muted">Today</span>
            </div>
            {clientTime.length ? (
              clientTime.slice(0, 4).map(({ client, seconds }) => (
                <div className="client-allocation" key={client.id}>
                  <div>
                    <span>
                      <i
                        className="client-dot"
                        style={{ background: client.color }}
                      />
                      {client.name}
                    </span>
                    <strong>{durationLabel(seconds)}</strong>
                  </div>
                  <div className="allocation-track">
                    <span
                      style={{
                        width: `${Math.min(100, (seconds / Math.max(1, logged)) * 100)}%`,
                        background: client.color,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="quiet-copy">
                Your client breakdown will appear as you log time.
              </p>
            )}
          </section>
          {todayPlans.length > 0 && (
            <button
              className="upcoming-note"
              onClick={() => onNavigate(ViewMode.TIMELINE)}
            >
              <CalendarDays size={20} />
              <span>
                <strong>{todayPlans.length} planned activities</strong>
                <small>Check what’s ahead in My day</small>
              </span>
              <ArrowRight size={17} />
            </button>
          )}
        </div>
      </div>
      <footer className="page-footer">
        Less busywork. More good work.<span>YOUR TIME, WELL SPENT.</span>
      </footer>
    </div>
  );
};
export default Dashboard;
