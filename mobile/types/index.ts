// Task types
export type TaskStatus = 'pending' | 'completed' | 'skipped' | 'in_progress';
export type TaskSource = 'llm' | 'manual';

export interface Subject {
  id: number;
  name: string;
  short_name: string | null;
  color: string;
  weightage: number;
  created_at: string;
}

export interface Task {
  id: number;
  user_id: number;
  goal_id: number | null;
  subject_id: number | null;
  title: string;
  description: string | null;
  topic: string | null;
  scheduled_date: string;
  due_date: string | null;
  completed_at: string | null;
  estimated_minutes: number;
  actual_minutes: number | null;
  status: TaskStatus;
  source: TaskSource;
  priority: number;
  is_revision: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  subject: Subject | null;
}

export interface TaskCreate {
  title: string;
  description?: string;
  topic?: string;
  scheduled_date: string;
  due_date?: string;
  estimated_minutes?: number;
  priority?: number;
  is_revision?: boolean;
  notes?: string;
  subject_id?: number;
  goal_id?: number;
  source?: TaskSource;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  topic?: string;
  scheduled_date?: string;
  due_date?: string;
  estimated_minutes?: number;
  actual_minutes?: number;
  status?: TaskStatus;
  priority?: number;
  is_revision?: boolean;
  notes?: string;
  subject_id?: number;
}

// Progress types
export interface DailyProgress {
  date: string;
  tasks_planned: number;
  tasks_completed: number;
  tasks_skipped: number;
  completion_rate: number;
  minutes_planned: number;
  minutes_actual: number;
}

export interface SubjectProgress {
  subject_id: number;
  subject_name: string;
  color: string;
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  total_minutes: number;
}

export interface ProgressSummary {
  current_streak: number;
  longest_streak: number;
  total_tasks_completed: number;
  total_minutes_studied: number;
  weekly_progress: DailyProgress[];
  subject_progress: SubjectProgress[];
  consistency_score: number;
}

// Insight types
export interface Insight {
  id: number;
  insight_type: string;
  title: string;
  content: string;
  data: Record<string, any> | null;
  is_read: boolean;
  is_actionable: boolean;
  priority: number;
  generated_at: string;
}

// Chat types
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ChatSession {
  id: number;
  title: string;
  messages: ChatMessage[];
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface ChatResponse {
  response: string;
  session_id: number;
  tasks_created: Task[] | null;
  action_taken: string | null;
}

// Dashboard types
export interface DashboardData {
  today_tasks: Task[];
  today_completed: number;
  today_total: number;
  week_completion_rate: number;
  current_streak: number;
  pending_insights: number;
  subjects_overview: SubjectProgress[];
  recent_insights: Insight[];
}

// Goal types
export interface Goal {
  id: number;
  user_id: number;
  subject_id: number | null;
  title: string;
  description: string | null;
  target_date: string | null;
  goal_type: string | null;
  raw_plan_text: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  subject: Subject | null;
}

// Auth types
export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
}
