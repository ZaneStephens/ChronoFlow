

export interface Client {
  id: string;
  name: string;
  color: string;
  contactName?: string;
  contactEmail?: string;
  services?: string;
  isInternal?: boolean; // New: Marks client as internal work (excluded from active counts, grouped in charts)
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  totalTime: number; // in seconds
}

export interface Task {
  id: string;
  clientId: string;
  title: string;
  description: string;
  ticketNumber?: string; // New field
  status: 'todo' | 'in-progress' | 'done';
  totalTime: number; // in seconds (aggregated from sessions not linked to subtasks + subtask times)
  createdAt: number;
}

export interface TimerSession {
  id: string;
  taskId?: string; // Made optional for Quick Entries
  subtaskId?: string; 
  clientId?: string; // New: For Quick Entries linked to a client
  customTitle?: string; // For Quick Entries
  startTime: number;
  endTime?: number;
  notes?: string;
  isManualLog?: boolean; 
}

export interface ActiveTimer {
  taskId?: string; // Optional for Quick Start/Gap filling
  subtaskId?: string;
  startTime: number;
}

export interface PlannedActivity {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: number; // Timestamp for start of the slot
  durationMinutes: number; // Default 30
  type: 'task' | 'quick';
  taskId?: string; // If type is task
  clientId?: string; // New: If type is quick (optional)
  quickTitle?: string; // If type is quick
  isLogged: boolean; // If true, a corresponding session exists
  recurringId?: string; // Link to a RecurringActivity rule if generated from one
}

export type RecurrenceFrequency = 'daily' | 'weekly' | 'fortnightly' | 'monthly' | 'monthly-nth';

export interface RecurringActivity {
  id: string;
  startDate: string; // YYYY-MM-DD - Anchor for fortnightly calculations
  type: 'task' | 'quick';
  taskId?: string;
  clientId?: string;
  quickTitle?: string;
  
  startTimeStr: string; // "HH:mm"
  durationMinutes: number;
  
  frequency: RecurrenceFrequency;
  
  // Weekly
  weekDays?: number[]; // 0 (Sun) - 6 (Sat)
  
  // Monthly
  monthDay?: number; // 1-31
  
  // Monthly Nth
  nthWeek?: number; // 1, 2, 3, 4, 5 (last)
  nthWeekDay?: number; // 0 (Sun) - 6 (Sat)
}

// For drag and drop or simple list rendering
export enum ViewMode {
  DASHBOARD = 'DASHBOARD',
  TASKS = 'TASKS',
  CLIENTS = 'CLIENTS',
  TIMELINE = 'TIMELINE',
  REPORTS = 'REPORTS',
  FOCUS = 'FOCUS'
}