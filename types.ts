

export interface Client {
  id: string;
  name: string;
  color: string;
  contactName?: string;
  contactEmail?: string;
  services?: string;
  isInternal?: boolean; 
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
  projectId?: string; // New: Link task to a project
  title: string;
  description: string;
  ticketNumber?: string; 
  status: 'todo' | 'in-progress' | 'done';
  totalTime: number; // in seconds
  createdAt: number;
}

export interface TimerSession {
  id: string;
  taskId?: string; 
  subtaskId?: string; 
  clientId?: string; 
  projectId?: string; // New: Link to project
  milestoneId?: string; // New: Link to milestone
  customTitle?: string; 
  startTime: number;
  endTime?: number;
  notes?: string;
  isManualLog?: boolean; 
}

export interface ActiveTimer {
  taskId?: string; 
  subtaskId?: string;
  startTime: number;
}

export interface PlannedActivity {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: number; 
  durationMinutes: number; 
  type: 'task' | 'quick';
  taskId?: string; 
  clientId?: string; 
  quickTitle?: string; 
  isLogged: boolean; 
  recurringId?: string; 
}

export type RecurrenceFrequency = 'daily' | 'weekly' | 'fortnightly' | 'monthly' | 'monthly-nth';

export interface RecurringActivity {
  id: string;
  startDate: string; 
  type: 'task' | 'quick';
  taskId?: string;
  clientId?: string;
  quickTitle?: string; 
  startTimeStr: string; 
  durationMinutes: number; 
  frequency: RecurrenceFrequency;
  weekDays?: number[]; 
  monthDay?: number; 
  nthWeek?: number; 
  nthWeekDay?: number; 
}

// --- Project Management Types ---

export interface Milestone {
  id: string;
  title: string;
  dueDate?: string; // YYYY-MM-DD
  isCompleted: boolean;
}

export interface ProjectRisk {
  id: string;
  risk: string;
  impact: 'Low' | 'Medium' | 'High';
  mitigation: string;
}

export interface Project {
  id: string;
  title: string;
  clientId: string;
  description: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed';
  startDate: string;
  dueDate?: string;
  milestones: Milestone[];
  risks: ProjectRisk[]; // AI Generated risks
  tags?: string[];
}

export interface ProjectTemplate {
  id: string;
  title: string;
  description: string;
  prompt?: string; // For AI generation
  structure?: { // For saved project structure
      milestones: { title: string; dueDateOffsetDays: number }[];
      risks: { risk: string; impact: 'Low' | 'Medium' | 'High'; mitigation: string }[];
  };
}

// --- Quarterly Rocks Types ---

export interface KeyResult {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface Rock {
  id: string;
  title: string; // The "What"
  description: string; // The "Why" / Context
  status: 'on-track' | 'at-risk' | 'off-track' | 'completed';
  quarter: string; // e.g., "Q1 2024"
  keyResults: KeyResult[]; // The "How" (Measurables)
  createdAt: number;
}

export enum ViewMode {
  DASHBOARD = 'DASHBOARD',
  PROJECTS = 'PROJECTS',
  ROCKS = 'ROCKS', // New View
  TASKS = 'TASKS',
  CLIENTS = 'CLIENTS',
  TIMELINE = 'TIMELINE',
  REPORTS = 'REPORTS',
  FOCUS = 'FOCUS'
}