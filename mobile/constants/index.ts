// API Configuration
// Change this to your backend URL
export const API_BASE_URL = 'http://localhost:8000/api';

// For production, use your deployed backend URL:
// export const API_BASE_URL = 'https://your-backend.com/api';

// Colors
export const Colors = {
  primary: '#1E3A8A',
  primaryLight: '#3B82F6',
  secondary: '#10B981',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#1E293B',
  textSecondary: '#64748B',
  textLight: '#94A3B8',
  border: '#E2E8F0',
  error: '#EF4444',
  warning: '#F59E0B',
  success: '#22C55E',

  // Task status colors
  pending: '#F59E0B',
  completed: '#22C55E',
  skipped: '#EF4444',
  in_progress: '#3B82F6',

  // Priority colors
  highPriority: '#EF4444',
  mediumPriority: '#F59E0B',
  lowPriority: '#22C55E',
};

// Spacing
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Font sizes
export const FontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// Subject colors (matching backend)
export const SubjectColors: Record<string, string> = {
  'Data Structures and Algorithms': '#EF4444',
  'Operating Systems': '#F97316',
  'Database Management Systems': '#EAB308',
  'Computer Networks': '#22C55E',
  'Theory of Computation': '#14B8A6',
  'Compiler Design': '#06B6D4',
  'Computer Organization and Architecture': '#3B82F6',
  'Digital Logic': '#6366F1',
  'Discrete Mathematics': '#8B5CF6',
  'Engineering Mathematics': '#A855F7',
  'Programming and Data Structures': '#EC4899',
  'Aptitude': '#F43F5E',
};

// Status display text
export const StatusLabels: Record<string, string> = {
  pending: 'Pending',
  completed: 'Completed',
  skipped: 'Skipped',
  in_progress: 'In Progress',
};

// Priority labels
export const PriorityLabels: Record<number, string> = {
  1: 'High',
  2: 'Medium',
  3: 'Low',
};
