import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { TimerSession, ActiveTimer } from '../types';
import { useData } from './DataContext';
import { getStore, setStore, removeStore } from '../services/storageService';

// Constants
const SIX_MINUTES_MS = 6 * 60 * 1000;
const generateId = () => Math.random().toString(36).substr(2, 9);

interface TimerContextType {
    isLoading: boolean;
    activeTimer: ActiveTimer | null;
    sessions: TimerSession[];

    // Actions
    startTimer: (taskId?: string, subtaskId?: string, startTimeOverride?: number) => void;
    stopTimerRequest: (timer: ActiveTimer) => void; // Request to stop (opens modal often)
    cancelActiveTimer: () => void;
finalizeSession: (timer: ActiveTimer, notes: string, rawEndTime: number, extraUpdates?: Partial<TimerSession>) => void;

    // CRUD
    addSession: (session: TimerSession) => void;
    updateSession: (sessionId: string, updates: Partial<TimerSession>) => void;
    deleteSession: (sessionId: string) => void;

    importSessionData: (data: any, strategy: 'merge' | 'overwrite') => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const useTimer = () => {
    const context = useContext(TimerContext);
    if (!context) {
        throw new Error('useTimer must be used within a TimerProvider');
    }
    return context;
};

export const TimerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { updateTask, updateSubtask, tasks, subtasks, updatePlannedActivity, plannedActivities } = useData();

    const isHydrated = useRef(false);
    const [isLoading, setIsLoading] = useState(true);

    const [sessions, setSessions] = useState<TimerSession[]>([]);
    const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);

    // --- Hydration from IndexedDB ---
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [storedSessions, storedTimer] = await Promise.all([
                    getStore<TimerSession[]>('sessions'),
                    getStore<ActiveTimer | null>('activeTimer'),
                ]);
                if (cancelled) return;
                setSessions(storedSessions ?? []);
                setActiveTimer(storedTimer ?? null);
                isHydrated.current = true;
            } catch (err) {
                console.error('[TimerContext] IndexedDB hydration failed:', err);
                isHydrated.current = true;
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // --- Write-through persistence ---
    useEffect(() => {
        if (!isHydrated.current) return;
        if (activeTimer) {
            setStore('activeTimer', activeTimer).catch(console.error);
        } else {
            removeStore('activeTimer').catch(console.error);
        }
    }, [activeTimer]);

    useEffect(() => {
        if (!isHydrated.current) return;
        setStore('sessions', sessions).catch(console.error);
    }, [sessions]);

    // --- Logic ---

    const startTimer = (taskId?: string, subtaskId?: string, startTimeOverride?: number) => {
        // If there is an active timer, the UI should usually handle stopping it first, 
        // or we can force stop it here. For now, we'll assume the UI handles the "Stop current first?" flow 
        // or that we can switch. In the original App.tsx, it requested stop.
        // For simplicity in Context, we'll set the new timer. 
        // The consuming UI should check `activeTimer` before calling this if it wants to prompt the user.

        const lastSessionEndTime = sessions.reduce((max, s) => Math.max(max, s.endTime || 0), 0);
        const now = Date.now();
        const startTime = startTimeOverride || Math.max(now, lastSessionEndTime);

        setActiveTimer({
            taskId,
            subtaskId,
            startTime
        });
    };

    const cancelActiveTimer = () => {
        setActiveTimer(null);
    };

    const stopTimerRequest = (timer: ActiveTimer) => {
        // This function is a bit of a placeholder in the Context refactor.
        // In App.tsx, `stopTimerRequest` logic handled showing the modal.
        // Since Modals are often UI concerns, we might need a "TimerManager" component 
        // or we expose the "logic" part only.
        // We will expose the *ability* to finalize, but the *decision* to show a modal 
        // belongs to the UI layer (App.tsx or a Layout).
        // However, to keep it simple, we won't put `stopTimerRequest` logic (modal triggering) deeply here.
        // We will just expose `finalizeSession`.
        // The `stopTimerRequest` in App.tsx had logic to auto-stop if subtask has no inputs needed.
        // We can duplicate that logic here or returns a status.
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
        setActiveTimer(null);

        // Update Totals
        if (newSession.subtaskId) {
            const sub = subtasks.find(s => s.id === newSession.subtaskId);
            if (sub) {
                updateSubtask({ ...sub, totalTime: sub.totalTime + durationInSeconds });
            }
        } else if (newSession.taskId) {
            const task = tasks.find(t => t.id === newSession.taskId);
            if (task) {
                updateTask({ ...task, totalTime: task.totalTime + durationInSeconds });
            }
        }
    };

    // CRUD
const addSession = (session: TimerSession) => {
        setSessions(prev => [...prev, session]);
        // Update task/subtask totals for manual entries
        if (session.endTime && session.startTime) {
            const duration = (session.endTime - session.startTime) / 1000;
            if (session.subtaskId) {
                const sub = subtasks.find(s => s.id === session.subtaskId);
                if (sub) updateSubtask({ ...sub, totalTime: sub.totalTime + duration });
            } else if (session.taskId) {
                const task = tasks.find(t => t.id === session.taskId);
                if (task) updateTask({ ...task, totalTime: task.totalTime + duration });
            }
        }
    };

const updateSession = (sessionId: string, updates: Partial<TimerSession>) => {
        const oldSession = sessions.find(s => s.id === sessionId);
        if (!oldSession) return;

        const newStart = updates.startTime !== undefined ? updates.startTime : oldSession.startTime;
        const newEnd = updates.endTime !== undefined ? updates.endTime : (oldSession.endTime || Date.now());
        const newDuration = newEnd - newStart;
        const oldDuration = (oldSession.endTime || Date.now()) - oldSession.startTime;
        const newDurationSec = Math.floor(newDuration / 1000);
        const oldDurationSec = Math.floor(oldDuration / 1000);

        const taskChanged = updates.taskId !== undefined && updates.taskId !== oldSession.taskId;
        const subtaskChanged = updates.subtaskId !== undefined && updates.subtaskId !== oldSession.subtaskId;

        setSessions(prev => prev.map(s => {
            if (s.id === sessionId) {
                const merged = { ...s, ...updates };
                if (taskChanged && updates.subtaskId === undefined) {
                    delete merged.subtaskId;
                }
                return merged;
            }
            return s;
        }));

        // --- Remove time from old allocation ---
        if (taskChanged || subtaskChanged) {
            // Full reallocation: remove all old time
            if (oldSession.subtaskId) {
                const oldSub = subtasks.find(s => s.id === oldSession.subtaskId);
                if (oldSub) updateSubtask({ ...oldSub, totalTime: Math.max(0, oldSub.totalTime - oldDurationSec) });
            } else if (oldSession.taskId) {
                const oldTask = tasks.find(t => t.id === oldSession.taskId);
                if (oldTask) updateTask({ ...oldTask, totalTime: Math.max(0, oldTask.totalTime - oldDurationSec) });
            }
        }

        // --- Add time to new allocation ---
        if (taskChanged || subtaskChanged) {
            // Adding to new target
            const targetTaskId = updates.taskId !== undefined ? updates.taskId : oldSession.taskId;
            const targetSubtaskId = updates.subtaskId !== undefined ? updates.subtaskId : (taskChanged ? undefined : oldSession.subtaskId);

            if (targetSubtaskId) {
                const newSub = subtasks.find(s => s.id === targetSubtaskId);
                if (newSub) updateSubtask({ ...newSub, totalTime: newSub.totalTime + newDurationSec });
            } else if (targetTaskId) {
                const newTask = tasks.find(t => t.id === targetTaskId);
                if (newTask) updateTask({ ...newTask, totalTime: newTask.totalTime + newDurationSec });
            }
        } else {
            // Same allocation: just adjust for duration change
            const durationDiff = newDurationSec - oldDurationSec;
            if (durationDiff !== 0) {
                if (oldSession.subtaskId) {
                    const sub = subtasks.find(s => s.id === oldSession.subtaskId);
                    if (sub) updateSubtask({ ...sub, totalTime: Math.max(0, sub.totalTime + durationDiff) });
                } else if (oldSession.taskId) {
                    const task = tasks.find(t => t.id === oldSession.taskId);
                    if (task) updateTask({ ...task, totalTime: Math.max(0, task.totalTime + durationDiff) });
                }
            }
        }
    };

    const deleteSession = (sessionId: string) => {
        const sessionToDelete = sessions.find(s => s.id === sessionId);
        if (!sessionToDelete) return;

        if (sessionToDelete.endTime) {
            const durationSec = (sessionToDelete.endTime - sessionToDelete.startTime) / 1000;
            if (sessionToDelete.subtaskId) {
                const sub = subtasks.find(s => s.id === sessionToDelete.subtaskId);
                if (sub) updateSubtask({ ...sub, totalTime: Math.max(0, sub.totalTime - durationSec) });
            } else if (sessionToDelete.taskId) {
                const task = tasks.find(t => t.id === sessionToDelete.taskId);
                if (task) updateTask({ ...task, totalTime: Math.max(0, task.totalTime - durationSec) });
            }
        }

        // Update planned activities if they were logged by this session
        // This depends on checking start time match, which is fuzzy.
        plannedActivities.forEach(p => {
            if (p.isLogged && Math.abs(p.startTime - sessionToDelete.startTime) < 1000) {
                updatePlannedActivity({ ...p, isLogged: false });
            }
        });

        setSessions(prev => prev.filter(s => s.id !== sessionId));
    };

    const importSessionData = (data: any, strategy: 'merge' | 'overwrite') => {
        if (strategy === 'merge') {
            if (data.sessions) {
                setSessions(prev => {
                    const map = new Map(prev.map(s => [s.id, s]));
                    (data.sessions as TimerSession[]).forEach(s => map.set(s.id, s));
                    return Array.from(map.values());
                });
            }
        } else {
            if (data.sessions) {
                setSessions(data.sessions);
                setActiveTimer(null); // Clear active timer on overwrite for safety
            }
        }
    };

    return (
        <TimerContext.Provider value={{
            isLoading,
            activeTimer, sessions,
            startTimer, stopTimerRequest: () => { }, // Placeholder for now usually
            cancelActiveTimer, finalizeSession,
            addSession, updateSession, deleteSession,
            importSessionData
        }}>
            {children}
        </TimerContext.Provider>
    );
};
