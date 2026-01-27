import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TaskBoard from './components/TaskBoard';
import ClientManager from './components/ClientManager';
import Dashboard from './components/Dashboard';
import FloatingTimer from './components/FloatingTimer';
import SessionModal from './components/SessionModal';
import Timeline from './components/Timeline';
import PlanModal from './components/PlanModal';
import TaskPreviewModal from './components/TaskPreviewModal';
import SearchModal from './components/SearchModal';
import FocusMode from './components/FocusMode';
import ReportGenerator from './components/ReportGenerator';
// Icons for Import Modal
import { AlertTriangle } from 'lucide-react';

import ProjectManager from './components/ProjectManager';
import RockManager from './components/RockManager';
import LandingPage from './components/LandingPage';
import TutorialOverlay, { TutorialStep } from './components/TutorialOverlay';
import { ViewMode, Client, Task, Subtask, ActiveTimer, TimerSession, PlannedActivity, RecurringActivity, Project, ProjectTemplate, Rock } from './types';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import { DataProvider, useData } from './contexts/DataContext';
import { TimerProvider, useTimer } from './contexts/TimerContext';

const InnerApp: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.DASHBOARD);

  // --- Context Hooks ---
  const {
    clients, projects, tasks, subtasks, rocks, plannedActivities, recurringActivities, customTemplates,
    addClient, updateClient, deleteClient,
    addProject, updateProject, deleteProject, addTemplate,
    addTask, updateTask, deleteTask, updateSubtask, addSubtasks, deleteSubtask,
    addRock, updateRock, deleteRock,
    addPlannedActivity, updatePlannedActivity, deletePlannedActivity,
    addRecurringActivity, deleteRecurringActivity,
    importData // Imported from DataContext
  } = useData();

  const {
    activeTimer, sessions,
    startTimer, stopTimerRequest: contextStopRequest, cancelActiveTimer, finalizeSession,
    addSession, updateSession, deleteSession,
    importSessionData // Imported from TimerContext
  } = useTimer();

  const showToast = useNotification().showToast;
  const requestConfirm = useNotification().requestConfirm; // Fix destructuring if needed based on context definition

  // NOTE: Destructuring was `const { showToast, requestConfirm } = useNotification();` in original. 
  // Assuming useNotification returns an object.

  // --- Import State ---
  const [pendingImportData, setPendingImportData] = useState<any | null>(null);

  // --- UI State (Modals & Tutorial) ---
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'edit' | 'stop' | 'log-plan' | 'create'>('stop');
  const [editingSession, setEditingSession] = useState<TimerSession | null>(null);
  const [pendingTimerStart, setPendingTimerStart] = useState<{ taskId?: string, subtaskId?: string } | null>(null);
  const [timerToStop, setTimerToStop] = useState<ActiveTimer | null>(null);
  const [pendingPlanLogId, setPendingPlanLogId] = useState<string | null>(null);

  // Plan Modal State
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [planInitData, setPlanInitData] = useState<{ date: string, time: number, duration?: number } | null>(null);
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
  const [projectLogInit, setProjectLogInit] = useState<{ projectId: string, milestoneId?: string } | undefined>(undefined);

  // Constants
  const SIX_MINUTES_MS = 6 * 60 * 1000;

  // --- Persistence Handlers (Tutorial only) ---
  useEffect(() => {
    // Check for tutorial flag
    const hasSeen = localStorage.getItem('hasSeenTutorial');
    if (hasSeen === 'true') {
      setShowLanding(false);
    }
  }, []);

  // --- Actions & Handlers ---

  // Note: Most persistence logic is now in Contexts.
  // We need to bridge UI interactions to Context calls.

  // Tutorial
  const tutorialSteps: TutorialStep[] = [
    {
      targetId: 'nav-dashboard',
      title: 'Command Center',
      description: 'Your Dashboard gives you an instant overview of your 7.6h daily goal, recent activity, and client breakdown.',
      view: ViewMode.DASHBOARD
    },
    {
      targetId: 'nav-timeline',
      title: 'Visual Timeline',
      description: 'A 6am-6pm continuous view of your day. Click anywhere on the grid to plan future work or log ad-hoc tasks.',
      view: ViewMode.TIMELINE
    },
    {
      targetId: 'task-board',
      title: 'Task Execution',
      description: 'Create tasks and link them to clients. Use the AI Magic Wand to automatically break down complex tickets into actionable subtasks.',
      view: ViewMode.TASKS
    },
    {
      targetId: 'nav-rocks',
      title: 'Quarterly Rocks',
      description: 'Set and track your major 90-day goals. Use AI to refine vague ideas into SMART Rocks with clear Key Results.',
      view: ViewMode.ROCKS
    },
    {
      targetId: 'nav-projects',
      title: 'Project Management',
      description: 'Plan large initiatives, track milestones, and use the AI Architect to build roadmaps and risk assessments instantly.',
      view: ViewMode.PROJECTS
    },
    {
      targetId: 'nav-clients',
      title: 'Client Management',
      description: 'Define your clients here. Assign colors, contact details, and service agreements to keep your portfolio organized.',
      view: ViewMode.CLIENTS
    },
    {
      targetId: 'nav-reports',
      title: 'AI Reporting',
      description: 'Generate professional status emails or technical breakdown reports for your clients instantly using Gemini AI.',
      view: ViewMode.REPORTS
    },
    {
      targetId: 'nav-focus',
      title: 'Focus Mode',
      description: 'Enter a distraction-free zone that shows only your active timer and current objective.',
      view: ViewMode.DASHBOARD
    }
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
    localStorage.setItem('hasSeenTutorial', 'true');
    setView(ViewMode.DASHBOARD);
  };

  // Timer Handlers (Bridging Context)
  const handleStartTimer = (taskId?: string, subtaskId?: string, startTimeOverride?: number) => {
    // Local check before calling context
    if (activeTimer) {
      if (activeTimer.taskId === taskId && activeTimer.subtaskId === subtaskId) return;
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
    if (timer.subtaskId && timer.taskId) {
      // Auto finalize if subtask
      const sub = subtasks.find(s => s.id === timer.subtaskId);
      finalizeSession(timer, sub?.title || '', Date.now());

      // Handle pending start
      if (pendingTimerStart) {
        // We need a small delay or state effect to start the next one? 
        // In React state updates are batched. 
        // BUT finalizeSession in context updates state.
        // We can rely on a local effect or just setTimeout. 
        // Actually, the original App.tsx called setActiveTimer immediately after.
        // Since `finalizeSession` is in Context, we can't chain easily unless it returns something or we do it here.
        // Wait, `finalizeSession` in Context does `setActiveTimer(null)`.
        // So if we call `startTimer` immediately after, it should work.
        startTimer(pendingTimerStart.taskId, pendingTimerStart.subtaskId, Date.now() + 100); // Small buffer
        setPendingTimerStart(null);
      }
    } else {
      setTimerToStop(timer);
      setModalMode('stop');
      setEditingSession(null);
      setModalOpen(true);
    }
  };

  const handleStopConfirm = (_id: string | null, updates: Partial<TimerSession>) => {
    if (timerToStop) {
      finalizeSession(timerToStop, updates.notes || '', Date.now(), updates);
      setTimerToStop(null);

      // Handle pending start
      if (pendingTimerStart) {
        startTimer(pendingTimerStart.taskId, pendingTimerStart.subtaskId, Date.now() + 100);
        setPendingTimerStart(null);
      }
    }
  };

  const handleSessionSave = (sessionId: string | null, updates: Partial<TimerSession>) => {
    if (modalMode === 'log-plan' && pendingPlanLogId) {
      completeLogPlan(pendingPlanLogId, updates.notes || '');
      setPendingPlanLogId(null);
      setModalOpen(false);
      return;
    }

    if (modalMode === 'stop') {
      handleStopConfirm(null, updates);
      setModalOpen(false);
      return;
    }

    if (modalMode === 'create') {
      addSession({
        id: Math.random().toString(36).substr(2, 9),
        startTime: Date.now(),
        endTime: Date.now(),
        isManualLog: true,
        ...editingSession,
        ...updates
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
    deleteSession(sessionId);
    setModalOpen(false);
  };

  const handleLogProjectTime = (projectId: string, milestoneId?: string) => {
    setProjectLogInit({ projectId, milestoneId });
    setModalMode('create');
    setEditingSession(null);
    setModalOpen(true);
  };

  const openEditSession = (session: TimerSession) => {
    setEditingSession(session);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleManualEntry = (startTime: number, endTime: number) => {
    const newSession: TimerSession = {
      id: Math.random().toString(36).substr(2, 9),
      startTime,
      endTime,
      notes: '',
      isManualLog: true
    };
    setEditingSession(newSession);
    setModalMode('create');
    setModalOpen(true);
  };

  // Plan Handlers
  const handleAddPlan = (date: string, time: number, initialDuration: number = 30) => {
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
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      if (editingPlan.id.startsWith('ghost_')) {
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
          recurringId: editingPlan.recurringId
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
        ...data.recurringRule
      });
    } else {
      const d = new Date(data.startTime);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
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
        isLogged: false
      });
    }
  };

  const createSessionFromPlan = (plan: PlannedActivity) => {
    updatePlannedActivity({ ...plan, isLogged: true });

    if (plan.type === 'task') {
      setPendingPlanLogId(plan.id);
      setModalMode('log-plan');
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
        notes: plan.quickTitle || 'Recurring Entry',
        isManualLog: true
      });
    }
  };

  const completeLogPlan = (planId: string, notes: string) => {
    const plan = plannedActivities.find(p => p.id === planId);
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
      isManualLog: true
    });

    updatePlannedActivity({ ...plan, isLogged: true });
    setTimerToStop(null);
  };

  const handleTogglePlanLog = (planId: string) => {
    if (planId.startsWith('ghost_')) {
      const [_, ruleId, dateKey] = planId.split('_');
      const rule = recurringActivities.find(r => r.id === ruleId);
      if (!rule) return;

      const [year, month, day] = dateKey.split('-').map(Number);
      const [h, m] = rule.startTimeStr.split(':').map(Number);
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
        recurringId: rule.id
      };

      addPlannedActivity(newPlan);
      createSessionFromPlan(newPlan);
      return;
    }

    const plan = plannedActivities.find(p => p.id === planId);
    if (!plan) return;

    if (plan.isLogged) {
      updatePlannedActivity({ ...plan, isLogged: false });
    } else {
      if (plan.type === 'task') {
        setPendingPlanLogId(planId);
        setModalMode('log-plan');
        setEditingSession(null);
        setTimerToStop({ taskId: plan.taskId!, startTime: plan.startTime });
        setModalOpen(true);
      } else {
        completeLogPlan(planId, plan.quickTitle || 'Quick Entry');
      }
    }
  };

  const handleUpdatePlan = (planId: string, newStartTime: number) => {
    if (planId.startsWith('ghost_')) {
      const [_, ruleId, dateKey] = planId.split('_');
      const rule = recurringActivities.find(r => r.id === ruleId);
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
        recurringId: rule.id
      });
    } else {
      const plan = plannedActivities.find(p => p.id === planId);
      if (plan) updatePlannedActivity({ ...plan, startTime: newStartTime });
    }
  };

  const handleDeletePlan = (id: string) => {
    if (id.startsWith('ghost_')) {
      const [_, ruleId] = id.split('_');
      deleteRecurringActivity(ruleId);
      showToast("Recurring rule deleted.", 'info');
      return;
    }
    deletePlannedActivity(id);
  };

  const handleToggleSubtask = (subtaskId: string) => {
    const s = subtasks.find(s => s.id === subtaskId);
    if (s) {
      updateSubtask({ ...s, isCompleted: !s.isCompleted });
    }
  };

  // Export/Import (Simplified for Context)
  const handleExportData = () => {
    const data = {
      version: 1,
      timestamp: Date.now(),
      clients, projects, customTemplates, rocks, tasks, subtasks, sessions, plannedActivities, recurringActivities,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chronoflow_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Backup exported successfully.", 'success');
  };

  const handleImportData = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        // Basic validation
        // We check for at least ONE known key to validate it's likely a ChronoFlow export
        const validKeys = ['clients', 'projects', 'tasks', 'sessions'];
        const hasValidKey = validKeys.some(k => Array.isArray(data[k]));

        if (!hasValidKey) {
          showToast("Invalid data format: Could not find recognizable data arrays.", 'error');
          return;
        }

        setPendingImportData(data);
      } catch (error) {
        console.error(error);
        showToast("Failed to parse the file. Please ensure it is a valid JSON export.", 'error');
      }
    };
    reader.readAsText(file);
  };

  const confirmImport = (strategy: 'merge' | 'overwrite') => {
    const data = pendingImportData;
    if (!data) return;

    if (strategy === 'merge') {
      importData(data, 'merge');
      importSessionData(data, 'merge');
      showToast("Import successful: Data merged.", 'success');
    } else {
      // Overwrite
      // Safety: Clear active timer handled in context
      importData(data, 'overwrite');
      importSessionData(data, 'overwrite');

      showToast("Import successful: Data overwritten.", 'success');
    }

    setPendingImportData(null);
  };


  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden select-none">
      <Sidebar
        view={view}
        setView={setView}
        onSearchClick={() => setSearchOpen(true)}
        onExport={handleExportData}
        onImport={handleImportData}
      />

      <main className="flex-1 overflow-auto relative flex flex-col">
        {showLanding ? (
          <LandingPage onStart={handleStartTutorial} />
        ) : (
          <>
            {view === ViewMode.DASHBOARD && (
              <Dashboard
                tasks={tasks}
                sessions={sessions}
                activeTimer={activeTimer}
                plannedActivities={plannedActivities}
                onStartTimer={handleStartTimer}
                onStopTimer={handleStopClick}
                clients={clients}
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
            )}
            {view === ViewMode.ROCKS && (
              <RockManager
                rocks={rocks}
                onAddRock={addRock}
                onUpdateRock={updateRock}
                onDeleteRock={deleteRock}
                requestConfirm={requestConfirm}
              />
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
                onUpdateSubtaskTitle={(id, title) => {
                  const s = subtasks.find(x => x.id === id);
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

            {/* Global Overlays */}
            <div className="absolute bottom-6 right-6 z-50">
              <FloatingTimer
                activeTimer={activeTimer}
                onStop={handleStopClick}
                onCancel={cancelActiveTimer}
                taskTitle={activeTimer?.subtaskId ? subtasks.find(s => s.id === activeTimer.subtaskId)?.title : tasks.find(t => t.id === activeTimer?.taskId)?.title}
              />
            </div>
          </>
        )}
      </main>

      {/* Modals */}
      <SessionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalMode}
        session={editingSession}
        timerToStop={timerToStop}
        tasks={tasks}
        subtasks={subtasks}
        onSave={handleSessionSave}
        onDelete={handleDeleteSession}
        clients={clients}
        projects={projects}
        projectLogInit={projectLogInit}
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
          subtasks={subtasks.filter(s => s.taskId === previewTask.id)}
          onUpdateTask={updateTask}
          onStartTimer={handleStartTimer}
          onToggleSubtask={handleToggleSubtask}
        />
      )}

      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        tasks={tasks}
        projects={projects}
        rocks={rocks}
        clients={clients}
        onNavigate={(view) => {
          setView(view);
          setSearchOpen(false);
        }}
      />

      {/* Import Confirmation Modal */}
      {pendingImportData && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="text-amber-500" /> Confirm Import
            </h3>
            <p className="text-slate-300 mb-6">
              How would you like to handle the imported data?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => confirmImport('merge')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2"
              >
                Merge with existing data
                <span className="text-xs opacity-75">(Recommended)</span>
              </button>
              <button
                onClick={() => confirmImport('overwrite')}
                className="bg-slate-700 hover:bg-red-600 hover:text-white text-slate-300 font-medium py-3 rounded-lg flex items-center justify-center gap-2"
              >
                Overwrite all data
                <span className="text-xs opacity-75">(Dangerous)</span>
              </button>
              <button
                onClick={() => setPendingImportData(null)}
                className="text-slate-400 hover:text-white py-2 mt-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
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
  return (
    <NotificationProvider>
      <DataProvider>
        <TimerProvider>
          <InnerApp />
        </TimerProvider>
      </DataProvider>
    </NotificationProvider>
  );
};

export default App;
