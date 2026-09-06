import React, { useState, useEffect, useRef } from "react";
import Sidebar, { viewLabels } from "./components/Sidebar";
import TaskBoard from "./components/TaskBoard";
import ClientManager from "./components/ClientManager";
import Dashboard from "./components/Dashboard";
import FloatingTimer from "./components/FloatingTimer";
import SessionModal from "./components/SessionModal";
import Timeline from "./components/Timeline";
import PlanModal from "./components/PlanModal";
import TaskPreviewModal from "./components/TaskPreviewModal";
import SearchModal from "./components/SearchModal";
import FocusMode from "./components/FocusMode";
import ReportGenerator from "./components/ReportGenerator";
// Icons for Import Modal
import { AlertTriangle, Menu, ChevronRight, Plus, Search } from "lucide-react";

import ProjectManager from "./components/ProjectManager";
import RockManager from "./components/RockManager";
import LandingPage from "./components/LandingPage";
import ErrorBoundary from "./components/ErrorBoundary";
import Dialog from "./components/ui/Dialog";
import TutorialOverlay, { TutorialStep } from "./components/TutorialOverlay";
import {
  ViewMode,
  Client,
  Task,
  Subtask,
  ActiveTimer,
  TimerSession,
  PlannedActivity,
  RecurringActivity,
  Project,
  ProjectTemplate,
  Rock,
} from "./types";
import {
  NotificationProvider,
  useNotification,
} from "./contexts/NotificationContext";
import { DataProvider, useData } from "./contexts/DataContext";
import { TimerProvider, useTimer } from "./contexts/TimerContext";
import { migrateFromLocalStorage } from "./services/storageService";

const InnerApp: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.DASHBOARD);
  const [mobileOpen, setMobileOpen] = useState(false);

  // --- Context Hooks ---
  const {
    clients,
    projects,
    tasks,
    subtasks,
    rocks,
    plannedActivities,
    recurringActivities,
    customTemplates,
    isLoading: dataLoading,
    addClient,
    updateClient,
    deleteClient,
    addProject,
    updateProject,
    deleteProject,
    addTemplate,
    addTask,
    updateTask,
    deleteTask,
    updateSubtask,
    addSubtasks,
    deleteSubtask,
    addRock,
    updateRock,
    deleteRock,
    addPlannedActivity,
    updatePlannedActivity,
    deletePlannedActivity,
    addRecurringActivity,
    deleteRecurringActivity,
    importData, // Imported from DataContext
  } = useData();

  const {
    activeTimer,
    sessions,
    isLoading: timerLoading,
    startTimer,
    stopTimerRequest: contextStopRequest,
    cancelActiveTimer,
    finalizeSession,
    addSession,
    updateSession,
    deleteSession,
    importSessionData, // Imported from TimerContext
  } = useTimer();

  const { showToast, requestConfirm } = useNotification();

  // --- Import State ---
  const [pendingImportData, setPendingImportData] = useState<any | null>(null);

  // --- UI State (Modals & Tutorial) ---
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<
    "edit" | "stop" | "log-plan" | "create"
  >("stop");
  const [editingSession, setEditingSession] = useState<TimerSession | null>(
    null,
  );
  const [pendingTimerStart, setPendingTimerStart] = useState<{
    taskId?: string;
    subtaskId?: string;
  } | null>(null);
  const [timerToStop, setTimerToStop] = useState<ActiveTimer | null>(null);
  const [pendingPlanLogId, setPendingPlanLogId] = useState<string | null>(null);

  // Plan Modal State
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [planInitData, setPlanInitData] = useState<{
    date: string;
    time: number;
    duration?: number;
  } | null>(null);
  const [editingPlan, setEditingPlan] = useState<PlannedActivity | null>(null);

  // Task Preview Modal State
  const [previewTask, setPreviewTask] = useState<Task | null>(null);

  // Search Modal State
  const [searchOpen, setSearchOpen] = useState(false);

  // Tutorial State
  const [showLanding, setShowLanding] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  // Project Log State to initialize Modal
  const [projectLogInit, setProjectLogInit] = useState<
    { projectId: string; milestoneId?: string } | undefined
  >(undefined);

  // --- Persistence Handlers (Tutorial only) ---
  useEffect(() => {
    // Check for tutorial flag
    const hasSeen = localStorage.getItem("hasSeenTutorial");
    if (hasSeen === "true") {
      setShowLanding(false);
    }
  }, []);

  useEffect(() => {
    if (
      !dataLoading &&
      !timerLoading &&
      (tasks.length || sessions.length || projects.length)
    )
      setShowLanding(false);
  }, [
    dataLoading,
    timerLoading,
    tasks.length,
    sessions.length,
    projects.length,
  ]);

  // ── Auto-backup reminder (every 14 days) ──
  useEffect(() => {
    const BACKUP_INTERVAL_DAYS = 14;
    const key = "lastBackupReminder";
    const lastReminder = localStorage.getItem(key);
    const now = Date.now();

    if (!lastReminder) {
      // First show — gentle intro
      localStorage.setItem(key, String(now));
      return;
    }

    const daysSince = (now - parseInt(lastReminder)) / (1000 * 60 * 60 * 24);
    if (daysSince >= BACKUP_INTERVAL_DAYS) {
      showToast(
        "Backup reminder: Export your data from the sidebar menu to avoid losing tracked time.",
        "info",
      );
      localStorage.setItem(key, String(now));
    }
  }, [showToast]);

  // --- Keyboard Shortcuts (Teams-iframe safe — no Ctrl+ combos) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (
        isInput ||
        target.tagName === "SELECT" ||
        document.querySelector("dialog[open]")
      )
        return;

      // "/" — open search (GitHub-style)
      if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setSearchOpen(true);
      }
      // Escape — close search
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // --- In-app Plan Reminders (no browser Notification API — Teams iframe safe) ---
  const remindedPlansRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const checkReminders = () => {
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      plannedActivities
        .filter((p) => !p.isLogged && !remindedPlansRef.current.has(p.id))
        .forEach((plan) => {
          const timeUntil = plan.startTime - now;
          if (timeUntil > 0 && timeUntil <= fiveMinutes) {
            remindedPlansRef.current.add(plan.id);
            const title =
              plan.quickTitle ||
              tasks.find((t) => t.id === plan.taskId)?.title ||
              "Planned activity";
            const minutesAway = Math.ceil(timeUntil / 60000);
            showToast(
              `\u23F0 "${title}" starts in ${minutesAway} minute${minutesAway !== 1 ? "s" : ""}`,
              "info",
            );
          }
        });
    };

    const interval = setInterval(checkReminders, 30000);
    checkReminders();
    return () => clearInterval(interval);
  }, [plannedActivities, tasks, showToast]);

  // --- Actions & Handlers ---

  // Note: Most persistence logic is now in Contexts.
  // We need to bridge UI interactions to Context calls.

  // Tutorial
  const tutorialSteps: TutorialStep[] = [
    {
      targetId: "nav-dashboard",
      title: "Command Center",
      description:
        "Your Dashboard gives you an instant overview of your 7.6h daily goal, recent activity, and client breakdown.",
      view: ViewMode.DASHBOARD,
    },
    {
      targetId: "nav-timeline",
      title: "Visual Timeline",
      description:
        "A 6am-6pm continuous view of your day. Click anywhere on the grid to plan future work or log ad-hoc tasks.",
      view: ViewMode.TIMELINE,
    },
    {
      targetId: "task-board",
      title: "Task Execution",
      description:
        "Create tasks and link them to clients. Use the AI Magic Wand to automatically break down complex tickets into actionable subtasks.",
      view: ViewMode.TASKS,
    },
    {
      targetId: "nav-rocks",
      title: "Quarterly Rocks",
      description:
        "Set and track your major 90-day goals. Use AI to refine vague ideas into SMART Rocks with clear Key Results.",
      view: ViewMode.ROCKS,
    },
    {
      targetId: "nav-projects",
      title: "Project Management",
      description:
        "Plan large initiatives, track milestones, and use the AI Architect to build roadmaps and risk assessments instantly.",
      view: ViewMode.PROJECTS,
    },
    {
      targetId: "nav-clients",
      title: "Client Management",
      description:
        "Define your clients here. Assign colors, contact details, and service agreements to keep your portfolio organized.",
      view: ViewMode.CLIENTS,
    },
    {
      targetId: "nav-reports",
      title: "AI Reporting",
      description:
        "Generate professional status emails or technical breakdown reports for your clients instantly using Gemini AI.",
      view: ViewMode.REPORTS,
    },
    {
      targetId: "nav-focus",
      title: "Focus Mode",
      description:
        "Enter a distraction-free zone that shows only your active timer and current objective.",
      view: ViewMode.DASHBOARD,
    },
  ];

  const handleStartTutorial = () => {
    setShowLanding(false);
    setShowTutorial(true);
    setTutorialStep(0);
    setView(ViewMode.DASHBOARD);
  };

  const handleNextTutorialStep = () => {
    const nextStep = tutorialStep + 1;
    if (nextStep < tutorialSteps.length) {
      setTutorialStep(nextStep);
      setView(tutorialSteps[nextStep].view as ViewMode);
    } else {
      completeTutorial();
    }
  };

  const completeTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem("hasSeenTutorial", "true");
    setView(ViewMode.DASHBOARD);
  };

  // Timer Handlers (Bridging Context)

  // Effect: When activeTimer becomes null and there's a pending start, start the next timer
  useEffect(() => {
    if (!activeTimer && pendingTimerStart) {
      startTimer(pendingTimerStart.taskId, pendingTimerStart.subtaskId);
      setPendingTimerStart(null);
    }
  }, [activeTimer, pendingTimerStart]);

  const handleStartTimer = (
    taskId?: string,
    subtaskId?: string,
    startTimeOverride?: number,
  ) => {
    // Local check before calling context
    if (activeTimer) {
      if (activeTimer.taskId === taskId && activeTimer.subtaskId === subtaskId)
        return;
      setPendingTimerStart({ taskId, subtaskId });
      localStopRequest(activeTimer);
    } else {
      startTimer(taskId, subtaskId, startTimeOverride);
    }
  };

  const handleStopClick = () => {
    if (activeTimer) localStopRequest(activeTimer);
  };

  const localStopRequest = (timer: ActiveTimer) => {
    if (timer.taskId || timer.subtaskId) {
      // Already allocated — auto-finalize with the task/subtask context
      const subtitle = timer.subtaskId
        ? subtasks.find((s) => s.id === timer.subtaskId)?.title || ""
        : tasks.find((t) => t.id === timer.taskId)?.title || "";
      finalizeSession(timer, subtitle, Date.now());
      // pendingTimerStart will be handled by the useEffect above once activeTimer becomes null
    } else {
      setTimerToStop(timer);
      setModalMode("stop");
      setEditingSession(null);
      setModalOpen(true);
    }
  };

  const handleStopConfirm = (
    _id: string | null,
    updates: Partial<TimerSession>,
  ) => {
    if (timerToStop) {
      finalizeSession(timerToStop, updates.notes || "", Date.now(), updates);
      setTimerToStop(null);
      // pendingTimerStart will be handled by the useEffect above once activeTimer becomes null
    }
  };

  const handleSessionSave = (
    sessionId: string | null,
    updates: Partial<TimerSession>,
  ) => {
    if (modalMode === "log-plan" && pendingPlanLogId) {
      completeLogPlan(pendingPlanLogId, updates.notes || "");
      setPendingPlanLogId(null);
      setModalOpen(false);
      return;
    }

    if (modalMode === "stop") {
      handleStopConfirm(null, updates);
      setModalOpen(false);
      return;
    }

    if (modalMode === "create") {
      addSession({
        id: Math.random().toString(36).substr(2, 9),
        startTime: Date.now(),
        endTime: Date.now(),
        isManualLog: true,
        ...editingSession,
        ...updates,
      });
      setModalOpen(false);
      return;
    }

    if (sessionId) {
      updateSession(sessionId, updates);
      setModalOpen(false);
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    const snapshot = sessions.find((s) => s.id === sessionId);
    deleteSession(sessionId);
    setModalOpen(false);
    if (snapshot) {
      showToast("Session deleted", "success", () => addSession(snapshot));
    }
  };

  const handleLogProjectTime = (projectId: string, milestoneId?: string) => {
    setProjectLogInit({ projectId, milestoneId });
    setModalMode("create");
    setEditingSession(null);
    setModalOpen(true);
  };

  const openEditSession = (session: TimerSession) => {
    setProjectLogInit(undefined);
    setEditingSession(session);
    setModalMode("edit");
    setModalOpen(true);
  };

  const handleManualEntry = (startTime: number, endTime: number) => {
    setProjectLogInit(undefined);
    const newSession: TimerSession = {
      id: Math.random().toString(36).substr(2, 9),
      startTime,
      endTime,
      notes: "",
      isManualLog: true,
    };
    setEditingSession(newSession);
    setModalMode("create");
    setModalOpen(true);
  };

  // Plan Handlers
  const handleAddPlan = (
    date: string,
    time: number,
    initialDuration: number = 30,
  ) => {
    setPlanInitData({ date, time, duration: initialDuration });
    setEditingPlan(null);
    setPlanModalOpen(true);
  };

  const handleEditPlan = (plan: PlannedActivity) => {
    setEditingPlan(plan);
    setPlanModalOpen(true);
  };

  const handleSavePlan = (data: any) => {
    if (editingPlan) {
      const d = new Date(data.startTime);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateKey = `${year}-${month}-${day}`;

      if (editingPlan.id.startsWith("ghost_")) {
        addPlannedActivity({
          id: Math.random().toString(36).substr(2, 9),
          date: dateKey,
          startTime: data.startTime,
          durationMinutes: data.duration,
          type: data.type,
          taskId: data.taskId,
          clientId: data.clientId,
          quickTitle: data.quickTitle,
          isLogged: false,
          recurringId: editingPlan.recurringId,
        });
      } else {
        updatePlannedActivity({
          ...editingPlan,
          date: dateKey,
          startTime: data.startTime,
          durationMinutes: data.duration,
          type: data.type,
          taskId: data.taskId,
          clientId: data.clientId,
          quickTitle: data.quickTitle,
        });
      }
      setEditingPlan(null);
    } else if (data.isRecurring && data.recurringRule) {
      addRecurringActivity({
        id: Math.random().toString(36).substr(2, 9),
        ...data.recurringRule,
      });
    } else {
      const d = new Date(data.startTime);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateKey = `${year}-${month}-${day}`;

      addPlannedActivity({
        id: Math.random().toString(36).substr(2, 9),
        date: dateKey,
        startTime: data.startTime,
        durationMinutes: data.duration,
        type: data.type,
        taskId: data.taskId,
        clientId: data.clientId,
        quickTitle: data.quickTitle,
        isLogged: false,
      });
    }
  };

  const createSessionFromPlan = (plan: PlannedActivity) => {
    updatePlannedActivity({ ...plan, isLogged: true });

    if (plan.type === "task") {
      setPendingPlanLogId(plan.id);
      setModalMode("log-plan");
      setEditingSession(null);
      setTimerToStop({ taskId: plan.taskId!, startTime: plan.startTime });
      setModalOpen(true);
    } else {
      const durationMs = plan.durationMinutes * 60 * 1000;
      const endTime = plan.startTime + durationMs;

      addSession({
        id: Math.random().toString(36).substr(2, 9),
        taskId: plan.taskId,
        clientId: plan.clientId,
        customTitle: plan.quickTitle,
        startTime: plan.startTime,
        endTime: endTime,
        notes: plan.quickTitle || "Recurring Entry",
        isManualLog: true,
      });
    }
  };

  const completeLogPlan = (planId: string, notes: string) => {
    const plan = plannedActivities.find((p) => p.id === planId);
    if (!plan) return;

    const durationMs = plan.durationMinutes * 60 * 1000;
    const endTime = plan.startTime + durationMs;

    addSession({
      id: Math.random().toString(36).substr(2, 9),
      taskId: plan.taskId,
      clientId: plan.clientId,
      customTitle: plan.quickTitle,
      startTime: plan.startTime,
      endTime: endTime,
      notes: notes,
      isManualLog: true,
    });

    updatePlannedActivity({ ...plan, isLogged: true });
    setTimerToStop(null);
  };

  const handleTogglePlanLog = (planId: string) => {
    if (planId.startsWith("ghost_")) {
      const [_, ruleId, dateKey] = planId.split("_");
      const rule = recurringActivities.find((r) => r.id === ruleId);
      if (!rule) return;

      const [year, month, day] = dateKey.split("-").map(Number);
      const [h, m] = rule.startTimeStr.split(":").map(Number);
      const startTime = new Date(year, month - 1, day, h, m).getTime();

      const newPlan: PlannedActivity = {
        id: Math.random().toString(36).substr(2, 9),
        date: dateKey,
        startTime,
        durationMinutes: rule.durationMinutes,
        type: rule.type,
        taskId: rule.taskId,
        clientId: rule.clientId,
        quickTitle: rule.quickTitle,
        isLogged: false,
        recurringId: rule.id,
      };

      addPlannedActivity(newPlan);
      createSessionFromPlan(newPlan);
      return;
    }

    const plan = plannedActivities.find((p) => p.id === planId);
    if (!plan) return;

    if (plan.isLogged) {
      updatePlannedActivity({ ...plan, isLogged: false });
    } else {
      if (plan.type === "task") {
        setPendingPlanLogId(planId);
        setModalMode("log-plan");
        setEditingSession(null);
        setTimerToStop({ taskId: plan.taskId!, startTime: plan.startTime });
        setModalOpen(true);
      } else {
        completeLogPlan(planId, plan.quickTitle || "Quick Entry");
      }
    }
  };

  const handleUpdatePlan = (planId: string, newStartTime: number) => {
    if (planId.startsWith("ghost_")) {
      const [_, ruleId, dateKey] = planId.split("_");
      const rule = recurringActivities.find((r) => r.id === ruleId);
      if (!rule) return;

      addPlannedActivity({
        id: Math.random().toString(36).substr(2, 9),
        date: dateKey,
        startTime: newStartTime,
        durationMinutes: rule.durationMinutes,
        type: rule.type,
        taskId: rule.taskId,
        clientId: rule.clientId,
        quickTitle: rule.quickTitle,
        isLogged: false,
        recurringId: rule.id,
      });
    } else {
      const plan = plannedActivities.find((p) => p.id === planId);
      if (plan) updatePlannedActivity({ ...plan, startTime: newStartTime });
    }
  };

  const handleDeletePlan = (id: string) => {
    if (id.startsWith("ghost_")) {
      const [_, ruleId] = id.split("_");
      deleteRecurringActivity(ruleId);
      showToast("Recurring rule deleted.", "info");
      return;
    }
    deletePlannedActivity(id);
  };

  const handleToggleSubtask = (subtaskId: string) => {
    const s = subtasks.find((s) => s.id === subtaskId);
    if (s) {
      updateSubtask({ ...s, isCompleted: !s.isCompleted });
    }
  };

  // Export/Import (Simplified for Context)
  const handleExportData = () => {
    const data = {
      version: 1,
      timestamp: Date.now(),
      clients,
      projects,
      customTemplates,
      rocks,
      tasks,
      subtasks,
      sessions,
      plannedActivities,
      recurringActivities,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chronoflow_backup_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Backup exported successfully.", "success");
  };

  const handleImportData = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        // Basic validation
        // We check for at least ONE known key to validate it's likely a ChronoFlow export
        const validKeys = ["clients", "projects", "tasks", "sessions"];
        const hasValidKey = validKeys.some((k) => Array.isArray(data[k]));

        if (!hasValidKey) {
          showToast(
            "Invalid data format: Could not find recognizable data arrays.",
            "error",
          );
          return;
        }

        setPendingImportData(data);
      } catch (error) {
        console.error(error);
        showToast(
          "Failed to parse the file. Please ensure it is a valid JSON export.",
          "error",
        );
      }
    };
    reader.readAsText(file);
  };

  const confirmImport = (strategy: "merge" | "overwrite") => {
    const data = pendingImportData;
    if (!data) return;

    if (strategy === "merge") {
      importData(data, "merge");
      importSessionData(data, "merge");
      showToast("Import successful: Data merged.", "success");
    } else {
      // Overwrite
      // Safety: Clear active timer handled in context
      importData(data, "overwrite");
      importSessionData(data, "overwrite");

      showToast("Import successful: Data overwritten.", "success");
    }

    setPendingImportData(null);
  };

  // Show loading screen while IndexedDB hydrates
  if (dataLoading || timerLoading) {
    return (
      <div className="flex h-screen bg-canvas items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-muted text-sm font-medium">
            Loading ChronoFlow...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`workspace-shell ${activeTimer ? "has-timer" : ""}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Sidebar
        view={view}
        setView={(next) => {
          setShowLanding(false);
          setView(next);
        }}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        taskCount={tasks.filter((t) => t.status !== "done").length}
        onSearchClick={() => setSearchOpen(true)}
        onExport={handleExportData}
        onImport={handleImportData}
      />

      <main className="workspace-main">
        <header className="workspace-topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu"
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb-root">My workspace</span>
            <ChevronRight className="breadcrumb-divider" size={13} />
            <strong>{viewLabels[view]}</strong>
          </div>
          <div className="topbar-actions">
            <span className="topbar-date">
              {new Date().toLocaleDateString("en-AU", {
                weekday: "short",
                day: "numeric",
                month: "long",
              })}
            </span>
            <button
              className="icon-button subtle"
              aria-label="Search workspace"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={17} />
            </button>
            <button
              className="button secondary small"
              onClick={() =>
                handleManualEntry(Date.now() - 30 * 60000, Date.now())
              }
            >
              <Plus size={16} /> Log time
            </button>
            <span className="topbar-avatar" aria-label="Personal workspace">
              CF
            </span>
          </div>
        </header>
        <div id="main-content" tabIndex={-1} className="workspace-scroll">
          {showLanding ? (
            <LandingPage
              onStart={handleStartTutorial}
              onSkip={() => {
                setShowLanding(false);
                completeTutorial();
              }}
            />
          ) : (
            <>
              {view === ViewMode.DASHBOARD && (
                <Dashboard
                  tasks={tasks}
                  sessions={sessions}
                  activeTimer={activeTimer}
                  clients={clients}
                  projects={projects}
                  plannedActivities={plannedActivities}
                  onStartTimer={handleStartTimer}
                  onStopTimer={handleStopClick}
                  onNavigate={setView}
                  onEditSession={openEditSession}
                  onCompleteTask={updateTask}
                  onManualEntry={() =>
                    handleManualEntry(Date.now() - 30 * 60000, Date.now())
                  }
                  onPlan={() => {
                    const d = new Date();
                    handleAddPlan(
                      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
                      Date.now(),
                    );
                  }}
                />
              )}
              {view === ViewMode.CLIENTS && (
                <ClientManager
                  clients={clients}
                  onAddClient={addClient}
                  onUpdateClient={updateClient}
                  onDeleteClient={deleteClient}
                />
              )}
              {view === ViewMode.PROJECTS && (
                <div className="legacy-page">
                  <ProjectManager
                    projects={projects}
                    clients={clients}
                    sessions={sessions}
                    customTemplates={customTemplates}
                    onAddProject={addProject}
                    onUpdateProject={updateProject}
                    onDeleteProject={deleteProject}
                    onSaveTemplate={addTemplate}
                    onLogTime={handleLogProjectTime}
                    /* Phase 2: injecting notification props explicitly if needed,
                   but we will refactor ProjectManager next to use hook
                */
                    requestConfirm={requestConfirm}
                    showToast={showToast}
                  />
                </div>
              )}
              {view === ViewMode.ROCKS && (
                <div className="legacy-page">
                  <RockManager
                    rocks={rocks}
                    onAddRock={addRock}
                    onUpdateRock={updateRock}
                    onDeleteRock={deleteRock}
                    requestConfirm={requestConfirm}
                  />
                </div>
              )}
              {view === ViewMode.TASKS && (
                <TaskBoard
                  tasks={tasks}
                  subtasks={subtasks}
                  clients={clients}
                  activeTimer={activeTimer}
                  onAddTask={addTask}
                  onUpdateTask={updateTask}
                  onDeleteTask={deleteTask}
                  onAddSubtasks={addSubtasks}
                  onUpdateSubtask={(id, title) => {
                    const s = subtasks.find((x) => x.id === id);
                    if (s) updateSubtask({ ...s, title });
                  }}
                  onToggleSubtask={handleToggleSubtask}
                  onDeleteSubtask={deleteSubtask}
                  onStartTimer={handleStartTimer}
                  onStopTimer={handleStopClick}
                  onPreviewTask={setPreviewTask}
                />
              )}
              {view === ViewMode.TIMELINE && (
                <Timeline
                  sessions={sessions}
                  plannedActivities={plannedActivities}
                  recurringActivities={recurringActivities}
                  tasks={tasks}
                  clients={clients}
                  subtasks={subtasks}
                  onAddPlan={handleAddPlan}
                  onToggleLog={handleTogglePlanLog}
                  onStartTimer={handleStartTimer}
                  onDeletePlan={handleDeletePlan}
                  onEditSession={openEditSession}
                  onPreviewTask={setPreviewTask}
                  onManualEntry={handleManualEntry}
                  onUpdatePlan={handleUpdatePlan}
                  onEditPlan={handleEditPlan}
                />
              )}
              {view === ViewMode.REPORTS && (
                <div className="legacy-page">
                  <ReportGenerator
                    clients={clients}
                    tasks={tasks}
                    sessions={sessions}
                    subtasks={subtasks}
                  />
                </div>
              )}
              {view === ViewMode.FOCUS && (
                <FocusMode
                  activeTimer={activeTimer}
                  tasks={tasks}
                  subtasks={subtasks}
                  onStopTimer={handleStopClick}
                  onStartTimer={handleStartTimer}
                />
              )}

              {/* Global Overlays */}
              <div>
                <FloatingTimer
                  activeTimer={activeTimer}
                  onStop={handleStopClick}
                  onCancel={() =>
                    requestConfirm({
                      title: "Discard this timer?",
                      message:
                        "This session will not be added to your time log.",
                      confirmLabel: "Discard timer",
                      variant: "danger",
                      onConfirm: cancelActiveTimer,
                    })
                  }
                  taskTitle={
                    activeTimer?.subtaskId
                      ? subtasks.find((s) => s.id === activeTimer.subtaskId)
                          ?.title
                      : tasks.find((t) => t.id === activeTimer?.taskId)?.title
                  }
                />
              </div>
            </>
          )}
        </div>
      </main>

      {/* Modals */}
      <SessionModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setPendingTimerStart(null);
          setTimerToStop(null);
          setPendingPlanLogId(null);
        }}
        mode={modalMode}
        session={editingSession}
        initialData={
          projectLogInit
            ? {
                projectId: projectLogInit.projectId,
                milestoneId: projectLogInit.milestoneId,
              }
            : undefined
        }
        tasks={tasks}
        onSave={handleSessionSave}
        onDelete={handleDeleteSession}
        clients={clients}
        projects={projects}
      />

      <PlanModal
        isOpen={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        initialTime={planInitData?.time}
        initialDuration={planInitData?.duration}
        editingPlan={editingPlan}
        tasks={tasks}
        clients={clients}
        onSave={handleSavePlan}
      />

      {previewTask && (
        <TaskPreviewModal
          task={previewTask}
          onClose={() => setPreviewTask(null)}
          subtasks={subtasks.filter((s) => s.taskId === previewTask.id)}
          clients={clients}
          onUpdateTask={updateTask}
          onStartTimer={handleStartTimer}
          onToggleSubtask={handleToggleSubtask}
        />
      )}

      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        tasks={tasks}
        sessions={sessions}
        projects={projects}
        rocks={rocks}
        clients={clients}
        onSelectTask={setPreviewTask}
        onSelectSession={openEditSession}
        onNavigate={(view) => {
          setView(view);
          setSearchOpen(false);
        }}
      />

      {/* Import Confirmation Modal */}
      {pendingImportData && (
        <Dialog
          title="Bring your work with you."
          onClose={() => setPendingImportData(null)}
        >
          <p className="dialog-description">
            This backup contains {pendingImportData.tasks?.length || 0} tasks,{" "}
            {pendingImportData.sessions?.length || 0} time entries and{" "}
            {pendingImportData.clients?.length || 0} clients. Choose how to
            restore it.
          </p>
          <div className="import-choices">
            <button
              className="button primary w-full mb-3"
              onClick={() => {
                confirmImport("merge");
                setShowLanding(false);
              }}
            >
              Merge with my workspace
            </button>
            <p className="text-xs text-muted mb-5">
              Keeps your existing records. Matching IDs are updated from the
              backup.
            </p>
            <button
              className="button secondary w-full mb-3"
              onClick={() => {
                confirmImport("overwrite");
                setShowLanding(false);
              }}
            >
              Replace with this backup
            </button>
            <p className="text-xs text-muted">
              Replaces the data collections included in this file and clears the
              active timer. Back up your workspace first if you need to keep it.
            </p>
          </div>
          <div className="dialog-actions">
            <button
              className="button secondary"
              onClick={() => setPendingImportData(null)}
            >
              Cancel import
            </button>
          </div>
        </Dialog>
      )}

      {/* Tutorial Overlay */}
      {showTutorial && (
        <TutorialOverlay
          step={tutorialSteps[tutorialStep]}
          totalSteps={tutorialSteps.length}
          currentStepIndex={tutorialStep}
          onNext={handleNextTutorialStep}
          onSkip={completeTutorial}
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [migrated, setMigrated] = useState(false);

  // Run one-time localStorage → IndexedDB migration before mounting providers
  useEffect(() => {
    migrateFromLocalStorage()
      .then(() => setMigrated(true))
      .catch(() => setMigrated(true)); // Continue even if migration fails
  }, []);

  if (!migrated) {
    return (
      <div className="flex h-screen bg-canvas items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-muted text-sm font-medium">
            Initializing storage...
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <NotificationProvider>
        <DataProvider>
          <TimerProvider>
            <InnerApp />
          </TimerProvider>
        </DataProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
};

export default App;
