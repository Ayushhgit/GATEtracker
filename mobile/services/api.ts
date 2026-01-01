import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/constants';
import {
  Task, TaskCreate, TaskUpdate, TaskStatus,
  Subject, Goal, ProgressSummary, Insight,
  ChatResponse, ChatSession, DashboardData,
  LoginResponse, User
} from '@/types';

const TOKEN_KEY = 'gate_tracker_token';

class ApiService {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          this.clearToken();
        }
        return Promise.reject(error);
      }
    );
  }

  // Token management
  async getToken(): Promise<string | null> {
    if (this.token) return this.token;
    try {
      this.token = await SecureStore.getItemAsync(TOKEN_KEY);
      return this.token;
    } catch {
      return null;
    }
  }

  async setToken(token: string): Promise<void> {
    this.token = token;
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }

  async clearToken(): Promise<void> {
    this.token = null;
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    if (!token) return false;

    try {
      await this.client.post('/auth/verify');
      return true;
    } catch {
      await this.clearToken();
      return false;
    }
  }

  // Auth
  async login(pin: string): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/auth/login', { pin });
    await this.setToken(response.data.access_token);
    return response.data;
  }

  async logout(): Promise<void> {
    await this.clearToken();
  }

  async getMe(): Promise<User> {
    const response = await this.client.get<User>('/auth/me');
    return response.data;
  }

  // Dashboard
  async getDashboard(): Promise<DashboardData> {
    const response = await this.client.get<DashboardData>('/dashboard');
    return response.data;
  }

  // Tasks
  async getTasks(params?: {
    start_date?: string;
    end_date?: string;
    status?: TaskStatus;
    subject_id?: number;
    limit?: number;
    offset?: number;
  }): Promise<Task[]> {
    const response = await this.client.get<Task[]>('/tasks', { params });
    return response.data;
  }

  async getTodayTasks(): Promise<Task[]> {
    const response = await this.client.get<Task[]>('/tasks/today');
    return response.data;
  }

  async getWeekTasks(weekOffset: number = 0): Promise<Task[]> {
    const response = await this.client.get<Task[]>('/tasks/week', {
      params: { week_offset: weekOffset }
    });
    return response.data;
  }

  async getTask(id: number): Promise<Task> {
    const response = await this.client.get<Task>(`/tasks/${id}`);
    return response.data;
  }

  async createTask(task: TaskCreate): Promise<Task> {
    const response = await this.client.post<Task>('/tasks', task);
    return response.data;
  }

  async updateTask(id: number, task: TaskUpdate): Promise<Task> {
    const response = await this.client.put<Task>(`/tasks/${id}`, task);
    return response.data;
  }

  async updateTaskStatus(id: number, status: TaskStatus, actualMinutes?: number): Promise<Task> {
    const response = await this.client.patch<Task>(`/tasks/${id}/status`, {
      status,
      actual_minutes: actualMinutes
    });
    return response.data;
  }

  async deleteTask(id: number): Promise<void> {
    await this.client.delete(`/tasks/${id}`);
  }

  async rescheduleTasks(taskIds: number[], newDate?: string): Promise<any> {
    const response = await this.client.post('/tasks/reschedule', {
      task_ids: taskIds,
      new_date: newDate
    });
    return response.data;
  }

  async getSkippedTasks(): Promise<any> {
    const response = await this.client.get('/tasks/skipped/auto-reschedule');
    return response.data;
  }

  // Subjects
  async getSubjects(): Promise<Subject[]> {
    const response = await this.client.get<Subject[]>('/subjects');
    return response.data;
  }

  async createSubject(subject: { name: string; short_name?: string; color?: string }): Promise<Subject> {
    const response = await this.client.post<Subject>('/subjects', subject);
    return response.data;
  }

  // Progress
  async getProgressSummary(): Promise<ProgressSummary> {
    const response = await this.client.get<ProgressSummary>('/progress/summary');
    return response.data;
  }

  async getSubjectProgress(): Promise<any> {
    const response = await this.client.get('/progress/subjects');
    return response.data;
  }

  async getProgressTrends(days: number = 30): Promise<any> {
    const response = await this.client.get('/progress/trends', { params: { days } });
    return response.data;
  }

  // Insights
  async getInsights(unreadOnly: boolean = false): Promise<Insight[]> {
    const response = await this.client.get<Insight[]>('/insights', {
      params: { unread_only: unreadOnly }
    });
    return response.data;
  }

  async generateInsights(): Promise<Insight[]> {
    const response = await this.client.post<Insight[]>('/insights/generate');
    return response.data;
  }

  async markInsightRead(id: number): Promise<void> {
    await this.client.patch(`/insights/${id}/read`);
  }

  async deleteInsight(id: number): Promise<void> {
    await this.client.delete(`/insights/${id}`);
  }

  // Chat
  async sendMessage(message: string, sessionId?: number): Promise<ChatResponse> {
    const response = await this.client.post<ChatResponse>('/chat', {
      message,
      session_id: sessionId
    });
    return response.data;
  }

  async getChatSessions(): Promise<ChatSession[]> {
    const response = await this.client.get<ChatSession[]>('/chat/sessions');
    return response.data;
  }

  async getChatSession(id: number): Promise<ChatSession> {
    const response = await this.client.get<ChatSession>(`/chat/sessions/${id}`);
    return response.data;
  }

  async deleteChatSession(id: number): Promise<void> {
    await this.client.delete(`/chat/sessions/${id}`);
  }

  async quickQuestion(question: string): Promise<{ response: string }> {
    const response = await this.client.post('/chat/quick-question', null, {
      params: { question }
    });
    return response.data;
  }

  // Planner
  async parsePlan(planText: string, startDate?: string, endDate?: string): Promise<any> {
    const response = await this.client.post('/planner/parse-plan', {
      plan_text: planText,
      start_date: startDate,
      end_date: endDate
    });
    return response.data;
  }

  async createFromPlan(planText: string, startDate?: string, endDate?: string): Promise<any> {
    const response = await this.client.post('/planner/create-from-plan', {
      plan_text: planText,
      start_date: startDate,
      end_date: endDate
    });
    return response.data;
  }

  async getGoals(): Promise<Goal[]> {
    const response = await this.client.get<Goal[]>('/planner/goals');
    return response.data;
  }

  async getGoal(id: number): Promise<any> {
    const response = await this.client.get(`/planner/goals/${id}`);
    return response.data;
  }

  async deleteGoal(id: number, deleteTasks: boolean = false): Promise<void> {
    await this.client.delete(`/planner/goals/${id}`, {
      params: { delete_tasks: deleteTasks }
    });
  }
}

export const api = new ApiService();
