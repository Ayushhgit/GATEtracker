// API Configuration
// Change this to your backend URL
export const API_BASE_URL = 'http://localhost:8000/api';

// For production, use your deployed backend URL:
// export const API_BASE_URL = 'https://your-backend.com/api';

// Dark Theme Colors with Gradients
export const Colors = {
  // Primary gradient colors
  primary: '#6366F1',       // Indigo
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',

  // Accent gradient colors
  accent: '#8B5CF6',        // Purple
  accentLight: '#A78BFA',

  // Secondary (teal/cyan)
  secondary: '#14B8A6',
  secondaryLight: '#2DD4BF',

  // Background colors (dark)
  background: '#0F0F1A',     // Deep dark blue
  backgroundLight: '#1A1A2E',
  surface: '#16162A',        // Card surfaces
  surfaceLight: '#1E1E38',

  // Text colors
  text: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textLight: '#71717A',
  textMuted: '#52525B',

  // Border colors
  border: '#27273D',
  borderLight: '#3F3F5C',

  // Status colors
  error: '#EF4444',
  errorLight: '#FCA5A5',
  warning: '#F59E0B',
  warningLight: '#FCD34D',
  success: '#22C55E',
  successLight: '#86EFAC',

  // Task status colors
  pending: '#F59E0B',
  completed: '#22C55E',
  skipped: '#EF4444',
  in_progress: '#6366F1',

  // Priority colors
  highPriority: '#EF4444',
  mediumPriority: '#F59E0B',
  lowPriority: '#22C55E',

  // Gradient presets
  gradientPrimary: ['#6366F1', '#8B5CF6'],
  gradientAccent: ['#8B5CF6', '#EC4899'],
  gradientSuccess: ['#22C55E', '#14B8A6'],
  gradientWarning: ['#F59E0B', '#EF4444'],
  gradientDark: ['#0F0F1A', '#1A1A2E'],
  gradientCard: ['#1E1E38', '#16162A'],
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

// Border radius
export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

// Subject colors (brighter for dark theme)
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
