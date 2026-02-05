import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import {
    Client, Task, Subtask, PlannedActivity, RecurringActivity,
    Project, ProjectTemplate, Rock
} from '../types';

// Simple ID generator
const generateId = () => Math.random().toString(36).substr(2, 9);

interface DataContextType {
    clients: Client[];
    projects: Project[];
    tasks: Task[];
    subtasks: Subtask[];
    rocks: Rock[];
    plannedActivities: PlannedActivity[];
    recurringActivities: RecurringActivity[];
    customTemplates: ProjectTemplate[];

    // Actions
    addClient: (client: Omit<Client, 'id'>) => void;
    updateClient: (client: Client) => void;
    deleteClient: (id: string) => void;

    addProject: (project: Project) => void;
    updateProject: (project: Project) => void;
    deleteProject: (id: string) => void;

    addTask: (task: Omit<Task, 'id' | 'createdAt' | 'totalTime' | 'status'>) => void;
    updateTask: (task: Task) => void;
    deleteTask: (id: string) => void;

    addSubtasks: (taskId: string, newSubtasks: { title: string; link?: string }[]) => void;
    updateSubtask: (subtask: Subtask) => void; // Generic update
    deleteSubtask: (id: string) => void;

    addRock: (rock: Rock) => void;
    updateRock: (rock: Rock) => void;
    deleteRock: (id: string) => void;

    addPlannedActivity: (activity: PlannedActivity) => void;
    updatePlannedActivity: (activity: PlannedActivity) => void;
    deletePlannedActivity: (id: string) => void;

    addRecurringActivity: (activity: RecurringActivity) => void;
    deleteRecurringActivity: (id: string) => void;

    addTemplate: (template: ProjectTemplate) => void;

    importData: (data: any, strategy: 'merge' | 'overwrite') => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // --- State (lazy-loaded from localStorage) ---
    const isInitialMount = useRef(true);

    const [clients, setClients] = useState<Client[]>(() => {
        const stored = localStorage.getItem('clients');
        return stored ? JSON.parse(stored) : [
            { id: '1', name: 'TechCorp', color: '#6366f1' },
            { id: '2', name: 'DesignStudio', color: '#ec4899' },
        ];
    });

    const [projects, setProjects] = useState<Project[]>(() => {
        const stored = localStorage.getItem('projects');
        return stored ? JSON.parse(stored) : [];
    });
    const [customTemplates, setCustomTemplates] = useState<ProjectTemplate[]>(() => {
        const stored = localStorage.getItem('customTemplates');
        return stored ? JSON.parse(stored) : [];
    });
    const [rocks, setRocks] = useState<Rock[]>(() => {
        const stored = localStorage.getItem('rocks');
        return stored ? JSON.parse(stored) : [];
    });

    const [tasks, setTasks] = useState<Task[]>(() => {
        const stored = localStorage.getItem('tasks');
        return stored ? JSON.parse(stored) : [
            { id: 't1', clientId: '1', title: 'Server Migration', description: 'Migrate legacy Ubuntu server to AWS', status: 'in-progress', totalTime: 3600, createdAt: Date.now() },
        ];
    });

    const [subtasks, setSubtasks] = useState<Subtask[]>(() => {
        const stored = localStorage.getItem('subtasks');
        return stored ? JSON.parse(stored) : [];
    });
    const [plannedActivities, setPlannedActivities] = useState<PlannedActivity[]>(() => {
        const stored = localStorage.getItem('plannedActivities');
        if (!stored) return [];
        let loadedPlans: PlannedActivity[] = JSON.parse(stored);

        // Rollover Logic: Move uncompleted non-recurring past activities to today
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const dStr = String(today.getDate()).padStart(2, '0');
        const todayKey = `${y}-${m}-${dStr}`;

        loadedPlans = loadedPlans.map(p => {
            if (!p.recurringId && !p.isLogged && p.date < todayKey) {
                const oldTime = new Date(p.startTime);
                const newStart = new Date(today);
                newStart.setHours(oldTime.getHours(), oldTime.getMinutes(), 0, 0);

                return {
                    ...p,
                    date: todayKey,
                    startTime: newStart.getTime()
                };
            }
            return p;
        });
        return loadedPlans;
    });
    const [recurringActivities, setRecurringActivities] = useState<RecurringActivity[]>(() => {
        const stored = localStorage.getItem('recurringActivities');
        return stored ? JSON.parse(stored) : [];
    });

    // --- Persistence (skip initial mount to avoid overwriting with defaults) ---
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        localStorage.setItem('clients', JSON.stringify(clients));
        localStorage.setItem('projects', JSON.stringify(projects));
        localStorage.setItem('customTemplates', JSON.stringify(customTemplates));
        localStorage.setItem('rocks', JSON.stringify(rocks));
        localStorage.setItem('tasks', JSON.stringify(tasks));
        localStorage.setItem('subtasks', JSON.stringify(subtasks));
        localStorage.setItem('plannedActivities', JSON.stringify(plannedActivities));
        localStorage.setItem('recurringActivities', JSON.stringify(recurringActivities));
    }, [clients, projects, customTemplates, rocks, tasks, subtasks, plannedActivities, recurringActivities]);

    // --- Actions ---

    // Clients
    const addClient = (client: Omit<Client, 'id'>) => {
        setClients(prev => [...prev, { ...client, id: generateId() }]);
    };
    const updateClient = (updatedClient: Client) => {
        setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    };
    const deleteClient = (id: string) => {
        setClients(prev => prev.filter(c => c.id !== id));
    };

    // Projects
    const addProject = (project: Project) => {
        setProjects(prev => [...prev, project]);
    };
    const updateProject = (updatedProject: Project) => {
        setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    };
    const deleteProject = (id: string) => {
        setProjects(prev => prev.filter(p => p.id !== id));
    };

    // Rocks
    const addRock = (rock: Rock) => {
        setRocks(prev => [...prev, rock]);
    };
    const updateRock = (updatedRock: Rock) => {
        setRocks(prev => prev.map(r => r.id === updatedRock.id ? updatedRock : r));
    };
    const deleteRock = (id: string) => {
        setRocks(prev => prev.filter(r => r.id !== id));
    };

    // Tasks
    const addTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'totalTime' | 'status'>) => {
        const newTask: Task = {
            ...taskData,
            id: generateId(),
            createdAt: Date.now(),
            status: 'todo',
            totalTime: 0
        };
        setTasks(prev => [newTask, ...prev]);
    };
    const updateTask = (updatedTask: Task) => {
        setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    };
    const deleteTask = (taskId: string) => {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        setSubtasks(prev => prev.filter(s => s.taskId !== taskId));
    };

    // Subtasks
    const addSubtasks = (taskId: string, newSubtasks: { title: string; link?: string }[]) => {
        const subtaskObjects: Subtask[] = newSubtasks.map(st => ({
            id: generateId(),
            taskId,
            title: st.title,
            isCompleted: false,
            totalTime: 0,
            link: st.link
        }));
        setSubtasks(prev => [...prev, ...subtaskObjects]);
    };
    const updateSubtask = (updatedSubtask: Subtask) => {
        setSubtasks(prev => prev.map(s => s.id === updatedSubtask.id ? updatedSubtask : s));
    };
    const deleteSubtask = (subtaskId: string) => {
        setSubtasks(prev => prev.filter(s => s.id !== subtaskId));
    };

    // Planned Activities
    const addPlannedActivity = (activity: PlannedActivity) => setPlannedActivities(prev => [...prev, activity]);
    const updatePlannedActivity = (activity: PlannedActivity) => setPlannedActivities(prev => prev.map(p => p.id === activity.id ? activity : p));
    const deletePlannedActivity = (id: string) => setPlannedActivities(prev => prev.filter(p => p.id !== id));

    // Recurring Activities
    const addRecurringActivity = (activity: RecurringActivity) => setRecurringActivities(prev => [...prev, activity]);
    const deleteRecurringActivity = (id: string) => setRecurringActivities(prev => prev.filter(a => a.id !== id));

    // Templates
    const addTemplate = (template: ProjectTemplate) => setCustomTemplates(prev => [...prev, template]);

    // Import Helper
    const importData = (data: any, strategy: 'merge' | 'overwrite') => {
        if (strategy === 'merge') {
            const merge = <T extends { id: string }>(current: T[], imported: T[] = []) => {
                const map = new Map(current.map(i => [i.id, i]));
                imported.forEach(i => map.set(i.id, i));
                return Array.from(map.values());
            };

            if (data.clients) setClients(prev => merge(prev, data.clients));
            if (data.projects) setProjects(prev => merge(prev, data.projects));
            if (data.customTemplates) setCustomTemplates(prev => merge(prev, data.customTemplates));
            if (data.rocks) setRocks(prev => merge(prev, data.rocks));
            if (data.tasks) setTasks(prev => merge(prev, data.tasks));
            if (data.subtasks) setSubtasks(prev => merge(prev, data.subtasks));
            if (data.plannedActivities) setPlannedActivities(prev => merge(prev, data.plannedActivities));
            if (data.recurringActivities) setRecurringActivities(prev => merge(prev, data.recurringActivities));
        } else {
            // Overwrite
            if (data.clients) setClients(data.clients);
            if (data.projects) setProjects(data.projects);
            if (data.customTemplates) setCustomTemplates(data.customTemplates);
            if (data.rocks) setRocks(data.rocks);
            if (data.tasks) setTasks(data.tasks);
            if (data.subtasks) setSubtasks(data.subtasks);
            if (data.plannedActivities) setPlannedActivities(data.plannedActivities);
            if (data.recurringActivities) setRecurringActivities(data.recurringActivities);
        }
    };


    return (
        <DataContext.Provider value={{
            clients, projects, tasks, subtasks, rocks, plannedActivities, recurringActivities, customTemplates,
            addClient, updateClient, deleteClient,
            addProject, updateProject, deleteProject,
            addTask, updateTask, deleteTask,
            addSubtasks, updateSubtask, deleteSubtask,
            addRock, updateRock, deleteRock,
            addPlannedActivity, updatePlannedActivity, deletePlannedActivity,
            addRecurringActivity, deleteRecurringActivity,
            addTemplate,
            importData
        }}>
            {children}
        </DataContext.Provider>
    );
};
