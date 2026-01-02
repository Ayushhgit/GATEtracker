// API Configuration
export const API_BASE_URL = 'http://10.162.218.37:8000/api';

// Professional Dark Theme Color Palette
export const Colors = {
  // Primary colors - Soft indigo for primary actions
  primary: '#7C3AED',
  primaryLight: '#8B5CF6',
  primaryDark: '#6D28D9',
  primaryMuted: 'rgba(124, 58, 237, 0.15)',

  // Accent - Complementary teal for secondary highlights
  accent: '#06B6D4',
  accentLight: '#22D3EE',
  accentMuted: 'rgba(6, 182, 212, 0.15)',

  // Background hierarchy - True dark with subtle blue undertone
  background: '#09090B',
  backgroundElevated: '#18181B',
  surface: '#1F1F23',
  surfaceElevated: '#27272A',

  // Text hierarchy
  text: '#FAFAFA',
  textSecondary: '#A1A1AA',
  textTertiary: '#71717A',
  textMuted: '#52525B',

  // Borders - Subtle separation
  border: '#27272A',
  borderLight: '#3F3F46',
  divider: '#27272A',

  // Semantic colors
  success: '#10B981',
  successMuted: 'rgba(16, 185, 129, 0.15)',
  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.15)',
  error: '#EF4444',
  errorMuted: 'rgba(239, 68, 68, 0.15)',
  info: '#3B82F6',
  infoMuted: 'rgba(59, 130, 246, 0.15)',

  // Task status
  pending: '#F59E0B',
  completed: '#10B981',
  skipped: '#EF4444',
  in_progress: '#3B82F6',

  // Priority
  highPriority: '#EF4444',
  mediumPriority: '#F59E0B',
  lowPriority: '#10B981',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',

  // Card shadows (for elevation)
  shadow: '#000000',
};

// Consistent spacing scale
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

// Typography scale
export const FontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 40,
};

// Font weights
export const FontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// Border radius scale
export const BorderRadius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

// Subject colors - Vibrant but balanced for dark theme
export const SubjectColors: Record<string, string> = {
  'Data Structures and Algorithms': '#F87171',
  'Operating Systems': '#FB923C',
  'Database Management Systems': '#FBBF24',
  'Computer Networks': '#34D399',
  'Theory of Computation': '#2DD4BF',
  'Compiler Design': '#22D3EE',
  'Computer Organization and Architecture': '#60A5FA',
  'Digital Logic': '#818CF8',
  'Discrete Mathematics': '#A78BFA',
  'Engineering Mathematics': '#C084FC',
  'Programming and Data Structures': '#F472B6',
  'Aptitude': '#FB7185',
};

// Status labels
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

// Animation durations
export const Animations = {
  fast: 150,
  normal: 250,
  slow: 400,
};
