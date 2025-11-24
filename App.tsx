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
import LandingPage from './components/LandingPage';
import TutorialOverlay, { TutorialStep } from './components/TutorialOverlay';
import { ViewMode, Client, Task, Subtask, ActiveTimer, TimerSession, PlannedActivity, RecurringActivity } from './types';

// Simple ID generator since we can't import uuid
const generateId = () => Math.random().toString(36).substr(2, 9);

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.DASHBOARD);
  
  // --- State ---
  const [clients, setClients] = useState<Client[]>([
    { id: '1', name: 'TechCorp', color: '#6366f1' },
    { id: '2', name: 'DesignStudio', color: '#ec4899' },
  ]);

  const [tasks, setTasks] = useState<Task[]>([
    { id: 't1', clientId: '1', title: 'Server Migration', description: 'Migrate legacy Ubuntu server to AWS', status: 'in-progress', totalTime: 3600, createdAt: Date.now() },
  ]);

  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [sessions, setSessions] = useState<TimerSession[]>([]);
  const [plannedActivities, setPlannedActivities] = useState<PlannedActivity[]>([]);
  const [recurringActivities, setRecurringActivities] = useState<RecurringActivity[]>([]);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'edit' | 'stop' | 'log-plan' | 'create'>('stop');
  const [editingSession, setEditingSession] = useState<TimerSession | null>(null);
  const [pendingTimerStart, setPendingTimerStart] = useState<{taskId?: string, subtaskId?: string} | null>(null);
  const [timerToStop, setTimerToStop] = useState<ActiveTimer | null>(null);
  const [pendingPlanLogId, setPendingPlanLogId] = useState<string | null>(null);

  // Plan Modal State
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [planInitData, setPlanInitData] = useState<{date: string, time: number, duration?: number} | null>(null);

  // Task Preview Modal State
  const [previewTask, setPreviewTask] = useState<Task | null>(null);

  // Search Modal State
  const [searchOpen, setSearchOpen] = useState(false);

  // Tutorial State
  const [showLanding, setShowLanding] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  // Constants
  const SIX_MINUTES_MS = 6 * 60 * 1000;

  // --- Persistence Handlers (Simulated) ---
  useEffect(() => {
    // Check for tutorial flag
    const hasSeen = localStorage.getItem('hasSeenTutorial');
    if (hasSeen === 'true') {
      setShowLanding(false);
    }

    const storedTimer = localStorage.getItem('activeTimer');
    if (storedTimer) setActiveTimer(JSON.parse(storedTimer));
    const storedSessions = localStorage.getItem('sessions');
    if (storedSessions) setSessions(JSON.parse(storedSessions));
    const storedTasks = localStorage.getItem('tasks');
    if (storedTasks) setTasks(JSON.parse(storedTasks));
    const storedSubtasks = localStorage.getItem('subtasks');
    if (storedSubtasks) setSubtasks(JSON.parse(storedSubtasks));
    const storedPlans = localStorage.getItem('plannedActivities');
    if (storedPlans) setPlannedActivities(JSON.parse(storedPlans));
    const storedRecurring = localStorage.getItem('recurringActivities');
    if (storedRecurring) setRecurringActivities(JSON.parse(storedRecurring));
    const storedClients = localStorage.getItem('clients');
    if (storedClients) setClients(JSON.parse(storedClients));
  }, []);

  useEffect(() => {
    if (activeTimer) localStorage.setItem('activeTimer', JSON.stringify(activeTimer));
    else localStorage.removeItem('activeTimer');
  }, [activeTimer]);

  useEffect(() => {
    localStorage.setItem('sessions', JSON.stringify(sessions));
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('subtasks', JSON.stringify(subtasks));
    localStorage.setItem('plannedActivities', JSON.stringify(plannedActivities));
    localStorage.setItem('recurringActivities', JSON.stringify(recurringActivities));
    localStorage.setItem('clients', JSON.stringify(clients));
  }, [sessions, tasks, subtasks, plannedActivities, recurringActivities, clients]);

  // --- Tutorial Steps Definition ---
  const tutorialSteps: TutorialStep[] = [
    {
        targetId: 'nav-dashboard',
        title: 'Command Center',
        description: 'Your Dashboard gives you an instant overview of your 7.6h daily goal, recent activity, and client breakdown.',
        view: ViewMode.DASHBOARD
    },
    {
        targetId: 'nav-clients',
        title: 'Client Management',
        description: 'Define your clients here. Assign colors, contact details, and service agreements to keep your portfolio organized.',
        view: ViewMode.CLIENTS
    },
    {
        targetId: 'task-board',
        title: 'Task Execution',
        description: 'Create tasks and link them to clients. Use the AI Magic Wand to automatically break down complex tickets into actionable subtasks.',
        view: ViewMode.TASKS
    },
    {
        targetId: 'nav-timeline',
        title: 'Visual Timeline',
        description: 'A 6am-6pm continuous view of your day. Click anywhere on the grid to plan future work or log ad-hoc tasks.',
        view: ViewMode.TIMELINE
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
        view: ViewMode.DASHBOARD // We point to the button in sidebar
    }
  ];

  const handleStartTutorial = () => {
    setShowLanding(false);
    setShowTutorial(true);
    setTutorialStep(0);
    setView(ViewMode.DASHBOARD); // Start at dashboard
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
    
    // Purge placeholder data
    setClients([]);
    setTasks([]);
    setSubtasks([]);
    setSessions([]);
    setPlannedActivities([]);
    setRecurringActivities([]);
    
    // Reset view
    setView(ViewMode.DASHBOARD);
  };

  // --- Actions ---

  const addClient = (client: Omit<Client, 'id'>) => {
    setClients([...clients, { ...client, id: generateId() }]);
  };

  const updateClient = (updatedClient: Client) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
  };

  const deleteClient = (id: string) => {
    setClients(clients.filter(c => c.id !== id));
  };

  const addTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'totalTime' | 'status'>) => {
    const newTask: Task = {
      ...taskData,
      id: generateId(),
      createdAt: Date.now(),
      status: 'todo',
      totalTime: 0
    };
    setTasks([newTask, ...tasks]);
  };

  const updateTaskStatus = (taskId: string, status: Task['status']) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
  };

  const addSubtasks = (taskId: string, newSubtasks: { title: string }[]) => {
    const subtaskObjects: Subtask[] = newSubtasks.map(st => ({
      id: generateId(),
      taskId,
      title: st.title,
      isCompleted: false,
      totalTime: 0
    }));
    setSubtasks([...subtasks, ...subtaskObjects]);
  };

  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
    setSubtasks(subtasks.filter(s => s.taskId !== taskId));
  };

  const toggleSubtask = (subtaskId: string) => {
    setSubtasks(subtasks.map(s => 
      s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s
    ));
  };

  const startTimer = (taskId?: string, subtaskId?: string, startTimeOverride?: number) => {
    // If a timer is running, we need to stop it first
    if (activeTimer) {
      // Prevent restarting the exact same task if just clicked again
      if (activeTimer.taskId === taskId && activeTimer.subtaskId === subtaskId) return;
      
      // If we are switching, queue the next start
      // Note: taskId can be undefined for quick start, which is valid
      setPendingTimerStart({ taskId, subtaskId });
      stopTimerRequest(activeTimer);
    } else {
      const lastSessionEndTime = sessions.reduce((max, s) => Math.max(max, s.endTime || 0), 0);
      const now = Date.now();
      // Use override if provided, otherwise max of now/last session
      const startTime = startTimeOverride || Math.max(now, lastSessionEndTime);

      setActiveTimer({
        taskId,
        subtaskId,
        startTime
      });
    }
  };

  const handleStopClick = () => {
    if (activeTimer) stopTimerRequest(activeTimer);
  };

  const stopTimerRequest = (timer: ActiveTimer) => {
    if (timer.subtaskId && timer.taskId) {
      const sub = subtasks.find(s => s.id === timer.subtaskId);
      finalizeSession(timer, sub?.title || '', Date.now());
    } else {
      setTimerToStop(timer);
      setModalMode('stop');
      setEditingSession(null);
      setModalOpen(true);
    }
  };

  const handleStopConfirm = (_id: string | null, updates: Partial<TimerSession>) => {
    if (timerToStop) {
      // Include updates like taskId/clientId/customTitle if the timer was unallocated
      // The updates object comes from SessionModal onSave
      finalizeSession(timerToStop, updates.notes || '', Date.now(), updates);
      setTimerToStop(null);
    }
  };

  const finalizeSession = (timer: ActiveTimer, notes: string, rawEndTime: number, extraUpdates?: Partial<TimerSession>) => {
    const rawDuration = rawEndTime - timer.startTime;
    let blocks = Math.ceil(rawDuration / SIX_MINUTES_MS);
    if (blocks < 1) blocks = 1;
    const roundedDuration = blocks * SIX_MINUTES_MS;
    const roundedEndTime = timer.startTime + roundedDuration;
    const durationInSeconds = roundedDuration / 1000;

    const newSession: TimerSession = {
      id: generateId(),
      taskId: timer.taskId,
      subtaskId: timer.subtaskId,
      startTime: timer.startTime,
      endTime: roundedEndTime,
      notes,
      isManualLog: false,
      ...extraUpdates // Merges taskId/clientId/customTitle if allocated during stop
    };
    
    setSessions(prev => [...prev, newSession]);

    // Only update total time if allocated to a task
    if (newSession.subtaskId) {
      setSubtasks(prev => prev.map(s => 
        s.id === newSession.subtaskId ? { ...s, totalTime: s.totalTime + durationInSeconds } : s
      ));
    } else if (newSession.taskId) {
      setTasks(prev => prev.map(t => 
        t.id === newSession.taskId ? { ...t, totalTime: t.totalTime + durationInSeconds } : t
      ));
    }

    setActiveTimer(null);

    // Explicitly check for non-null pendingTimerStart to avoid issues with falsy values if taskId is undefined
    if (pendingTimerStart) {
      setActiveTimer({
        taskId: pendingTimerStart.taskId,
        subtaskId: pendingTimerStart.subtaskId,
        startTime: roundedEndTime
      });
      setPendingTimerStart(null);
    }
  };

  const openEditSession = (session: TimerSession) => {
    setEditingSession(session);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleManualEntry = (startTime: number, endTime: number) => {
     const newSession: TimerSession = {
         id: generateId(), 
         startTime,
         endTime,
         notes: '',
         isManualLog: true
     };
     setEditingSession(newSession);
     setModalMode('create');
     setModalOpen(true);
  };

  const handleSessionSave = (sessionId: string | null, updates: Partial<TimerSession>) => {
    // Handle 'log-plan' mode specially
    if (modalMode === 'log-plan' && pendingPlanLogId) {
        completeLogPlan(pendingPlanLogId, updates.notes || '');
        setPendingPlanLogId(null);
        return;
    }
    
    if (modalMode === 'stop') {
        handleStopConfirm(null, updates);
        return;
    }

    // Handle Create New Session (Manual Entry)
    if (modalMode === 'create') {
        const newSession: TimerSession = {
            id: generateId(),
            startTime: Date.now(), // Fallback
            endTime: Date.now(), // Fallback
            isManualLog: true,
            ...editingSession, // Base defaults
            ...updates // User inputs
        };
        
        setSessions(prev => [...prev, newSession]);
        
        // Update task times if allocated
        if (newSession.endTime && newSession.startTime) {
             const duration = (newSession.endTime - newSession.startTime) / 1000;
             if (newSession.taskId) {
                  setTasks(prev => prev.map(t => t.id === newSession.taskId ? { ...t, totalTime: t.totalTime + duration } : t));
             }
        }
        return;
    }

    // Handle Edit Existing
    if (!sessionId) return;
    
    const oldSession = sessions.find(s => s.id === sessionId);
    if (!oldSession) return;

    let durationDiff = 0;
    // Calculate new duration
    const newStart = updates.startTime !== undefined ? updates.startTime : oldSession.startTime;
    const newEnd = updates.endTime !== undefined ? updates.endTime : (oldSession.endTime || Date.now());
    const newDuration = newEnd - newStart;
    
    // Calculate old duration
    const oldDuration = (oldSession.endTime || Date.now()) - oldSession.startTime;
    
    durationDiff = Math.floor((newDuration - oldDuration) / 1000);

    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, ...updates } : s));

    // Handle time updates
    // Scenario 1: Task ID didn't change, just duration
    if ((!updates.taskId || updates.taskId === oldSession.taskId) && oldSession.taskId) {
        if (durationDiff !== 0) {
            if (oldSession.subtaskId) {
                setSubtasks(prev => prev.map(s => s.id === oldSession.subtaskId ? { ...s, totalTime: s.totalTime + durationDiff } : s));
            } else {
                setTasks(prev => prev.map(t => t.id === oldSession.taskId ? { ...t, totalTime: t.totalTime + durationDiff } : t));
            }
        }
    } 
    // Scenario 2: Allocation Changed (e.g. was Quick/None, now Task) or Task Swapped
    else if (updates.taskId !== undefined && updates.taskId !== oldSession.taskId) {
         const newSec = Math.floor(newDuration / 1000);
         const oldSec = Math.floor(oldDuration / 1000);

         // Remove time from old task if it existed
         if (oldSession.taskId) {
             setTasks(prev => prev.map(t => t.id === oldSession.taskId ? { ...t, totalTime: Math.max(0, t.totalTime - oldSec) } : t));
         }
         
         // Add time to new task
         if (updates.taskId) {
             setTasks(prev => prev.map(t => t.id === updates.taskId ? { ...t, totalTime: t.totalTime + newSec } : t));
         }
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    const sessionToDelete = sessions.find(s => s.id === sessionId);
    if (!sessionToDelete) return;

    // 1. Update Totals (Reverse what finalizeSession/handleEditConfirm did)
    if (sessionToDelete.endTime) {
        const durationSec = (sessionToDelete.endTime - sessionToDelete.startTime) / 1000;
        
        if (sessionToDelete.subtaskId) {
            setSubtasks(prev => prev.map(s => 
                s.id === sessionToDelete.subtaskId 
                ? { ...s, totalTime: Math.max(0, s.totalTime - durationSec) } 
                : s
            ));
        } else if (sessionToDelete.taskId) {
            setTasks(prev => prev.map(t => 
                t.id === sessionToDelete.taskId 
                ? { ...t, totalTime: Math.max(0, t.totalTime - durationSec) } 
                : t
            ));
        }
    }

    // 2. Un-log matched Plan if exists
    // We match roughly by startTime (since it's usually exact) and ensuring it was logged
    setPlannedActivities(prev => prev.map(p => {
        if (p.isLogged && Math.abs(p.startTime - sessionToDelete.startTime) < 1000) {
             return { ...p, isLogged: false };
        }
        return p;
    }));

    // 3. Remove Session
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    setModalOpen(false);
  };

  // --- Planning Logic ---
  const handleAddPlan = (date: string, time: number, initialDuration: number = 30) => {
    setPlanInitData({ date, time, duration: initialDuration });
    setPlanModalOpen(true);
  };

  const handleSavePlan = (data: any) => {
    if (data.isRecurring && data.recurringRule) {
        // Saving a recurring rule
        const newRule: RecurringActivity = {
            id: generateId(),
            ...data.recurringRule
        };
        setRecurringActivities(prev => [...prev, newRule]);
    } else {
        // Saving a single planned activity
        const d = new Date(data.startTime);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;

        const newPlan: PlannedActivity = {
          id: generateId(),
          date: dateKey,
          startTime: data.startTime,
          durationMinutes: data.duration,
          type: data.type,
          taskId: data.taskId,
          clientId: data.clientId,
          quickTitle: data.quickTitle,
          isLogged: false
        };
        setPlannedActivities(prev => [...prev, newPlan]);
    }
  };

  const handleDeleteRecurringRule = (ruleId: string) => {
      setRecurringActivities(prev => prev.filter(r => r.id !== ruleId));
  };

  const handleTogglePlanLog = (planId: string) => {
    // Check if this is a "Ghost" ID from the Timeline (recurring item not yet instantiated)
    if (planId.startsWith('ghost_')) {
        // Format: ghost_RULEID_DATEKEY
        const [_, ruleId, dateKey] = planId.split('_');
        const rule = recurringActivities.find(r => r.id === ruleId);
        if (!rule) return;

        // Instantiate this ghost as a real planned activity first
        const [year, month, day] = dateKey.split('-').map(Number);
        const [h, m] = rule.startTimeStr.split(':').map(Number);
        const startTime = new Date(year, month - 1, day, h, m).getTime();

        const newPlan: PlannedActivity = {
            id: generateId(),
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

        setPlannedActivities(prev => [...prev, newPlan]);
        
        // Immediately trigger the log flow for this new ID
        createSessionFromPlan(newPlan);
        return;
    }

    const plan = plannedActivities.find(p => p.id === planId);
    if (!plan) return;

    if (plan.isLogged) {
      setPlannedActivities(prev => prev.map(p => p.id === planId ? { ...p, isLogged: false } : p));
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

  const createSessionFromPlan = (plan: PlannedActivity) => {
     // Mark plan as logged
     setPlannedActivities(prev => prev.map(p => p.id === plan.id ? { ...p, isLogged: true } : p));
     
     if (plan.type === 'task') {
        // For tasks, we still want to show the modal to enter notes
        setPendingPlanLogId(plan.id);
        setModalMode('log-plan');
        setEditingSession(null);
        setTimerToStop({ taskId: plan.taskId!, startTime: plan.startTime });
        setModalOpen(true);
     } else {
        // Quick entry, just log it
        const durationMs = plan.durationMinutes * 60 * 1000;
        let blocks = Math.ceil(durationMs / SIX_MINUTES_MS);
        if (blocks < 1) blocks = 1;
        const roundedDuration = blocks * SIX_MINUTES_MS;
        const endTime = plan.startTime + roundedDuration;

        const newSession: TimerSession = {
           id: generateId(),
           taskId: plan.taskId, 
           clientId: plan.clientId,
           customTitle: plan.quickTitle, 
           startTime: plan.startTime,
           endTime: endTime,
           notes: plan.quickTitle || 'Recurring Entry',
           isManualLog: true
        };
        setSessions(prev => [...prev, newSession]);
     }
  };

  const completeLogPlan = (planId: string, notes: string) => {
    const plan = plannedActivities.find(p => p.id === planId);
    if (!plan) return;

    const durationMs = plan.durationMinutes * 60 * 1000;
    let blocks = Math.ceil(durationMs / SIX_MINUTES_MS);
    if (blocks < 1) blocks = 1;
    const roundedDuration = blocks * SIX_MINUTES_MS;
    const endTime = plan.startTime + roundedDuration;

    const newSession: TimerSession = {
       id: generateId(),
       taskId: plan.taskId, 
       clientId: plan.clientId,
       customTitle: plan.quickTitle, 
       startTime: plan.startTime,
       endTime: endTime,
       notes: notes,
       isManualLog: true
    };
    
    setSessions(prev => [...prev, newSession]);
     
    if (plan.taskId) {
        const durationSec = roundedDuration / 1000;
        setTasks(prev => prev.map(t => t.id === plan.taskId ? { ...t, totalTime: t.totalTime + durationSec } : t));
    }

    setPlannedActivities(prev => prev.map(p => p.id === planId ? { ...p, isLogged: true } : p));
    setTimerToStop(null); 
  };

  const handleDeletePlan = (id: string) => {
    if (id.startsWith('ghost_')) {
        if (confirm("This is a recurring rule. Do you want to delete the entire recurring rule?")) {
            const [_, ruleId] = id.split('_');
            handleDeleteRecurringRule(ruleId);
        }
        return;
    }
    setPlannedActivities(prev => prev.filter(p => p.id !== id));
  };

  // --- Render ---

  if (showLanding) {
    return <LandingPage onStart={handleStartTutorial} />;
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      {showTutorial && (
        <TutorialOverlay 
            steps={tutorialSteps} 
            currentStepIndex={tutorialStep} 
            onNext={handleNextTutorialStep} 
            onSkip={completeTutorial}
        />
      )}

      <Sidebar 
        currentView={view} 
        setView={setView} 
        onSearchClick={() => setSearchOpen(true)}
      />
      
      <main className="flex-1 md:ml-64 relative overflow-y-auto h-full scroll-smooth">
        {view === ViewMode.FOCUS ? (
          <FocusMode 
            activeTimer={activeTimer}
            tasks={tasks}
            subtasks={subtasks}
            onStopTimer={handleStopClick}
            onStartTimer={startTimer}
          />
        ) : (
           <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 mb-20">
             {view === ViewMode.DASHBOARD && (
               <Dashboard 
                 tasks={tasks} 
                 clients={clients} 
                 subtasks={subtasks}
                 sessions={sessions} 
                 activeTimer={activeTimer}
                 onEditSession={openEditSession}
               />
             )}
             
             {view === ViewMode.TASKS && (
               <TaskBoard
                 tasks={tasks}
                 subtasks={subtasks}
                 clients={clients}
                 activeTimer={activeTimer}
                 onAddTask={addTask}
                 onAddSubtasks={addSubtasks}
                 onDeleteTask={deleteTask}
                 onUpdateTaskStatus={updateTaskStatus}
                 onToggleSubtask={toggleSubtask}
                 onStartTimer={startTimer}
                 onStopTimer={handleStopClick}
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
                 onStartTimer={startTimer}
                 onDeletePlan={handleDeletePlan}
                 onEditSession={openEditSession}
                 onPreviewTask={setPreviewTask}
                 onManualEntry={handleManualEntry}
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

             {view === ViewMode.REPORTS && (
               <ReportGenerator
                 clients={clients}
                 tasks={tasks}
                 sessions={sessions}
                 subtasks={subtasks}
               />
             )}
           </div>
        )}
      </main>

      {/* Hide Floating Timer in Focus Mode to avoid duplication */}
      {view !== ViewMode.FOCUS && (
        <FloatingTimer 
          activeTimer={activeTimer} 
          tasks={tasks} 
          subtasks={subtasks} 
          stopTimer={handleStopClick} 
        />
      )}

      <SessionModal
        isOpen={modalOpen}
        onClose={() => {
           setModalOpen(false);
           setPendingTimerStart(null);
           setPendingPlanLogId(null);
        }}
        onSave={handleSessionSave}
        onDelete={handleDeleteSession}
        mode={modalMode === 'log-plan' ? 'stop' : modalMode} 
        session={editingSession}
        initialData={timerToStop ? { taskId: timerToStop.taskId, subtaskId: timerToStop.subtaskId } : undefined}
        tasks={tasks}
        clients={clients}
      />

      <PlanModal 
        isOpen={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        onSave={handleSavePlan}
        onDeleteRule={handleDeleteRecurringRule}
        tasks={tasks}
        clients={clients}
        recurringActivities={recurringActivities}
        initialTime={planInitData?.time}
        initialDuration={planInitData?.duration}
      />

      <TaskPreviewModal 
        isOpen={!!previewTask}
        onClose={() => setPreviewTask(null)}
        task={previewTask}
        client={previewTask ? clients.find(c => c.id === previewTask.clientId) || null : null}
        subtasks={previewTask ? subtasks.filter(s => s.taskId === previewTask.id) : []}
        onStartTimer={startTimer}
      />

      <SearchModal 
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        tasks={tasks}
        sessions={sessions}
        clients={clients}
      />
    </div>
  );
};

export default App;