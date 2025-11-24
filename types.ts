export interface Client {
  id: string;
  name: string;
  color: string;
  contactName?: string;
  contactEmail?: string;
  services?: string;
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
  taskId: string;
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