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
import ProjectManager from './components/ProjectManager';
import RockManager from './components/RockManager';
import LandingPage from './components/LandingPage';
import TutorialOverlay, { TutorialStep } from './components/TutorialOverlay';
import ToastContainer, { ToastMessage, ToastType } from './components/Toast';
import { ViewMode, Client, Task, Subtask, ActiveTimer, TimerSession, PlannedActivity, RecurringActivity, Project, ProjectTemplate, Rock } from './types';
import { AlertTriangle } from 'lucide-react';

// Simple ID generator since we can't import uuid
const generateId = () => Math.random().toString(36).substr(2, 9);

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.DASHBOARD);
  
  // --- State ---
  const [clients, setClients] = useState<Client[]>([
    { id: '1', name: 'TechCorp', color: '#6366f1' },
    { id: '2', name: 'DesignStudio', color: '#ec4899' },
  ]);

  const [projects, setProjects] = useState<Project[]>([]);
  const [customTemplates, setCustomTemplates] = useState<ProjectTemplate[]>([]);
  const [rocks, setRocks] = useState<Rock[]>([]);

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
  const [projectLogInit, setProjectLogInit] = useState<{projectId: string, milestoneId?: string} | undefined>(undefined);

  // Import State
  const [pendingImportData, setPendingImportData] = useState<any>(null);

  // Toast State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

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
    const storedProjects = localStorage.getItem('projects');
    if (storedProjects) setProjects(JSON.parse(storedProjects));
    const storedTemplates = localStorage.getItem('customTemplates');
    if (storedTemplates) setCustomTemplates(JSON.parse(storedTemplates));
    const storedRocks = localStorage.getItem('rocks');
    if (storedRocks) setRocks(JSON.parse(storedRocks));
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
    localStorage.setItem('projects', JSON.stringify(projects));
    localStorage.setItem('customTemplates', JSON.stringify(customTemplates));
    localStorage.setItem('rocks', JSON.stringify(rocks));
  }, [sessions, tasks, subtasks, plannedActivities, recurringActivities, clients, projects, customTemplates, rocks]);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = generateId();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // --- Tutorial Steps Definition ---
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
    
    // Purge placeholder data
    setClients([]);
    setTasks([]);
    setSubtasks([]);
    setSessions([]);
    setPlannedActivities([]);
    setRecurringActivities([]);
    setProjects([]);
    setCustomTemplates([]);
    setRocks([]);
    
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

  // Project Actions
  const addProject = (project: Project) => {
    setProjects(prev => [...prev, project]);
  };
  
  const updateProject = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const saveTemplate = (template: ProjectTemplate) => {
    setCustomTemplates(prev => [...prev, template]);
  };
  
  const handleLogProjectTime = (projectId: string, milestoneId?: string) => {
     setProjectLogInit({ projectId, milestoneId });
     setModalMode('create');
     setEditingSession(null);
     setModalOpen(true);
  };

  // Rock Actions
  const addRock = (rock: Rock) => {
    setRocks(prev => [...prev, rock]);
  };

  const updateRock = (updatedRock: Rock) => {
    setRocks(prev => prev.map(r => r.id === updatedRock.id ? updatedRock : r));
  };

  const deleteRock = (id: string) => {
    setRocks(prev => prev.filter(r => r.id !== id));
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

  const updateTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const updateTaskStatus = (taskId: string, status: Task['status']) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
  };

  const addSubtasks = (taskId: string, newSubtasks: { title: string; link?: string }[]) => {
    const subtaskObjects: Subtask[] = newSubtasks.map(st => ({
      id: generateId(),
      taskId,
      title: st.title,
      isCompleted: false,
      totalTime: 0,
      link: st.link
    }));
    setSubtasks([...subtasks, ...subtaskObjects]);
  };

  const updateSubtaskTitle = (subtaskId: string, title: string) => {
    setSubtasks(prev => prev.map(s => s.id === subtaskId ? { ...s, title } : s));
  };

  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
    setSubtasks(subtasks.filter(s => s.taskId !== taskId));
  };

  const deleteSubtask = (subtaskId: string) => {
      setSubtasks(prev => prev.filter(s => s.id !== subtaskId));
  };

  const toggleSubtask = (subtaskId: string) => {
    setSubtasks(subtasks.map(s => 
      s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s
    ));
  };

  const startTimer = (taskId?: string, subtaskId?: string, startTimeOverride?: number) => {
    if (activeTimer) {
      if (activeTimer.taskId === taskId && activeTimer.subtaskId === subtaskId) return;
      
      setPendingTimerStart({ taskId, subtaskId });
      stopTimerRequest(activeTimer);
    } else {
      const lastSessionEndTime = sessions.reduce((max, s) => Math.max(max, s.endTime || 0), 0);
      const now = Date.now();
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

  const cancelActiveTimer = () => {
    setActiveTimer(null);
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
      ...extraUpdates 
    };
    
    setSessions(prev => [...prev, newSession]);

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
    if (modalMode === 'log-plan' && pendingPlanLogId) {
        completeLogPlan(pendingPlanLogId, updates.notes || '');
        setPendingPlanLogId(null);
        return;
    }
    
    if (modalMode === 'stop') {
        handleStopConfirm(null, updates);
        return;
    }

    if (modalMode === 'create') {
        const newSession: TimerSession = {
            id: generateId(),
            startTime: Date.now(), 
            endTime: Date.now(), 
            isManualLog: true,
            ...editingSession, 
            ...updates 
        };
        
        setSessions(prev => [...prev, newSession]);
        
        if (newSession.endTime && newSession.startTime) {
             const duration = (newSession.endTime - newSession.startTime) / 1000;
             if (newSession.taskId) {
                  setTasks(prev => prev.map(t => t.id === newSession.taskId ? { ...t, totalTime: t.totalTime + duration } : t));
             }
        }
        return;
    }

    if (!sessionId) return;
    
    const oldSession = sessions.find(s => s.id === sessionId);
    if (!oldSession) return;

    let durationDiff = 0;
    const newStart = updates.startTime !== undefined ? updates.startTime : oldSession.startTime;
    const newEnd = updates.endTime !== undefined ? updates.endTime : (oldSession.endTime || Date.now());
    const newDuration = newEnd - newStart;
    
    const oldDuration = (oldSession.endTime || Date.now()) - oldSession.startTime;
    
    durationDiff = Math.floor((newDuration - oldDuration) / 1000);

    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, ...updates } : s));

    if ((!updates.taskId || updates.taskId === oldSession.taskId) && oldSession.taskId) {
        if (durationDiff !== 0) {
            if (oldSession.subtaskId) {
                setSubtasks(prev => prev.map(s => s.id === oldSession.subtaskId ? { ...s, totalTime: s.totalTime + durationDiff } : s));
            } else {
                setTasks(prev => prev.map(t => t.id === oldSession.taskId ? { ...t, totalTime: t.totalTime + durationDiff } : t));
            }
        }
    } 
    else if (updates.taskId !== undefined && updates.taskId !== oldSession.taskId) {
         const newSec = Math.floor(newDuration / 1000);
         const oldSec = Math.floor(oldDuration / 1000);

         if (oldSession.taskId) {
             setTasks(prev => prev.map(t => t.id === oldSession.taskId ? { ...t, totalTime: Math.max(0, t.totalTime - oldSec) } : t));
         }
         
         if (updates.taskId) {
             setTasks(prev => prev.map(t => t.id === updates.taskId ? { ...t, totalTime: t.totalTime + newSec } : t));
         }
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    const sessionToDelete = sessions.find(s => s.id === sessionId);
    if (!sessionToDelete) return;

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

    setPlannedActivities(prev => prev.map(p => {
        if (p.isLogged && Math.abs(p.startTime - sessionToDelete.startTime) < 1000) {
             return { ...p, isLogged: false };
        }
        return p;
    }));

    setSessions(prev => prev.filter(s => s.id !== sessionId));
    setModalOpen(false);
  };

  // --- Planning Logic ---
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
             const newPlan: PlannedActivity = {
                id: generateId(),
                date: dateKey,
                startTime: data.startTime,
                durationMinutes: data.duration,
                type: data.type,
                taskId: data.taskId,
                clientId: data.clientId,
                quickTitle: data.quickTitle,
                isLogged: false,
                recurringId: editingPlan.recurringId
             };
             setPlannedActivities(prev => [...prev, newPlan]);
        } else {
             setPlannedActivities(prev => prev.map(p => p.id === editingPlan.id ? {
                ...p,
                date: dateKey,
                startTime: data.startTime,
                durationMinutes: data.duration,
                type: data.type,
                taskId: data.taskId,
                clientId: data.clientId,
                quickTitle: data.quickTitle,
             } : p));
        }
        setEditingPlan(null);
    } else if (data.isRecurring && data.recurringRule) {
        const newRule: RecurringActivity = {
            id: generateId(),
            ...data.recurringRule
        };
        setRecurringActivities(prev => [...prev, newRule]);
    } else {
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

  const handleUpdatePlan = (planId: string, newStartTime: number) => {
    if (planId.startsWith('ghost_')) {
        const [_, ruleId, dateKey] = planId.split('_');
        const rule = recurringActivities.find(r => r.id === ruleId);
        if (!rule) return;

        const newPlan: PlannedActivity = {
            id: generateId(),
            date: dateKey,
            startTime: newStartTime,
            durationMinutes: rule.durationMinutes,
            type: rule.type,
            taskId: rule.taskId,
            clientId: rule.clientId,
            quickTitle: rule.quickTitle,
            isLogged: false,
            recurringId: rule.id
        };
        setPlannedActivities(prev => [...prev, newPlan]);
    } else {
        setPlannedActivities(prev => prev.map(p => p.id === planId ? { ...p, startTime: newStartTime } : p));
    }
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
     setPlannedActivities(prev => prev.map(p => p.id === plan.id ? { ...p, isLogged: true } : p));
     
     if (plan.type === 'task') {
        setPendingPlanLogId(plan.id);
        setModalMode('log-plan');
        setEditingSession(null);
        setTimerToStop({ taskId: plan.taskId!, startTime: plan.startTime });
        setModalOpen(true);
     } else {
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
        // Since we can't use native confirm easily in some environments, and this is a recurring rule,
        // we might just delete it. However, implementing the custom modal for this too is heavy.
        // For now, let's assume direct deletion or use the new Toast to inform.
        // Actually, let's replace this confirm as well if possible, or just proceed.
        const [_, ruleId] = id.split('_');
        handleDeleteRecurringRule(ruleId);
        showToast("Recurring rule deleted.", 'info');
        return;
    }
    setPlannedActivities(prev => prev.filter(p => p.id !== id));
  };

  // --- Export / Import Handlers ---

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
            if (!data.clients || !Array.isArray(data.clients)) {
                showToast("Invalid data format: Missing clients array.", 'error');
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
          // Merge Helper
          const merge = <T extends { id: string }>(current: T[], imported: T[] = []) => {
              const map = new Map(current.map(i => [i.id, i]));
              imported.forEach(i => map.set(i.id, i));
              return Array.from(map.values());
          };

          setClients(prev => merge(prev, data.clients));
          setProjects(prev => merge(prev, data.projects));
          setCustomTemplates(prev => merge(prev, data.customTemplates));
          setRocks(prev => merge(prev, data.rocks));
          setTasks(prev => merge(prev, data.tasks));
          setSubtasks(prev => merge(prev, data.subtasks));
          setSessions(prev => merge(prev, data.sessions));
          setPlannedActivities(prev => merge(prev, data.plannedActivities));
          setRecurringActivities(prev => merge(prev, data.recurringActivities));
          
          showToast("Import successful: Data merged.", 'success');
      } else {
          // Overwrite
          setClients(data.clients || []);
          setProjects(data.projects || []);
          setCustomTemplates(data.customTemplates || []);
          setRocks(data.rocks || []);
          setTasks(data.tasks || []);
          setSubtasks(data.subtasks || []);
          setSessions(data.sessions || []);
          setPlannedActivities(data.plannedActivities || []);
          setRecurringActivities(data.recurringActivities || []);
          setActiveTimer(null); // Safety clear
          
          showToast("Import successful: Data overwritten.", 'success');
      }

      setPendingImportData(null);
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
        onExport={handleExportData}
        onImport={handleImportData}
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
             
             {view === ViewMode.PROJECTS && (
               <ProjectManager
                 projects={projects}
                 clients={clients}
                 sessions={sessions}
                 customTemplates={customTemplates}
                 onAddProject={addProject}
                 onUpdateProject={updateProject}
                 onDeleteProject={deleteProject}
                 onSaveTemplate={saveTemplate}
                 onLogTime={handleLogProjectTime}
               />
             )}

             {view === ViewMode.ROCKS && (
               <RockManager
                 rocks={rocks}
                 onAddRock={addRock}
                 onUpdateRock={updateRock}
                 onDeleteRock={deleteRock}
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
                 onUpdateSubtask={updateSubtaskTitle}
                 onAddSubtasks={addSubtasks}
                 onDeleteTask={deleteTask}
                 onDeleteSubtask={deleteSubtask}
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
                 onUpdatePlan={handleUpdatePlan}
                 onEditPlan={handleEditPlan}
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
          cancelTimer={cancelActiveTimer}
        />
      )}

      <SessionModal
        isOpen={modalOpen}
        onClose={() => {
           setModalOpen(false);
           setPendingTimerStart(null);
           setPendingPlanLogId(null);
           setProjectLogInit(undefined);
        }}
        onSave={handleSessionSave}
        onDelete={handleDeleteSession}
        mode={modalMode === 'log-plan' ? 'stop' : modalMode} 
        session={editingSession}
        initialData={timerToStop ? { taskId: timerToStop.taskId, subtaskId: timerToStop.subtaskId } : projectLogInit ? { projectId: projectLogInit.projectId, milestoneId: projectLogInit.milestoneId } : undefined}
        tasks={tasks}
        clients={clients}
        projects={projects}
      />

      <PlanModal 
        isOpen={planModalOpen}
        onClose={() => { setPlanModalOpen(false); setEditingPlan(null); }}
        onSave={handleSavePlan}
        onDeleteRule={handleDeleteRecurringRule}
        tasks={tasks}
        clients={clients}
        recurringActivities={recurringActivities}
        initialTime={planInitData?.time}
        initialDuration={planInitData?.duration}
        editingPlan={editingPlan}
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

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default App;