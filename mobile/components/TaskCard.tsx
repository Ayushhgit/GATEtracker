import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Task, TaskStatus } from '@/types';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants';

interface TaskCardProps {
  task: Task;
  onPress?: () => void;
  onStatusChange?: (status: TaskStatus) => void;
  showDate?: boolean;
}

export function TaskCard({ task, onPress, onStatusChange, showDate = false }: TaskCardProps) {
  const getStatusIcon = () => {
    switch (task.status) {
      case 'completed':
        return <Ionicons name="checkmark-circle" size={26} color={Colors.completed} />;
      case 'skipped':
        return <Ionicons name="close-circle" size={26} color={Colors.skipped} />;
      case 'in_progress':
        return <Ionicons name="time" size={26} color={Colors.in_progress} />;
      default:
        return (
          <View style={styles.pendingIcon}>
            <Ionicons name="ellipse-outline" size={26} color={Colors.pending} />
          </View>
        );
    }
  };

  const handleStatusToggle = () => {
    if (!onStatusChange) return;
    const nextStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
    onStatusChange(nextStatus);
  };

  const getPriorityColor = () => {
    switch (task.priority) {
      case 1: return Colors.highPriority;
      case 2: return Colors.mediumPriority;
      default: return Colors.lowPriority;
    }
  };

  const getPriorityGradient = (): [string, string] => {
    switch (task.priority) {
      case 1: return ['#EF4444', '#DC2626'];
      case 2: return ['#F59E0B', '#D97706'];
      default: return ['#22C55E', '#16A34A'];
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        task.status === 'completed' && styles.completedContainer,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Priority gradient bar */}
      <LinearGradient
        colors={getPriorityGradient()}
        style={styles.priorityBar}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      <Pressable onPress={handleStatusToggle} style={styles.statusButton}>
        {getStatusIcon()}
      </Pressable>

      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            task.status === 'completed' && styles.completedTitle,
          ]}
          numberOfLines={2}
        >
          {task.title}
        </Text>

        <View style={styles.metaRow}>
          {task.subject && (
            <LinearGradient
              colors={[task.subject.color + '40', task.subject.color + '20']}
              style={styles.subjectBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={[styles.subjectText, { color: task.subject.color }]}>
                {task.subject.short_name || task.subject.name}
              </Text>
            </LinearGradient>
          )}

          {task.topic && (
            <Text style={styles.topic} numberOfLines={1}>
              {task.topic}
            </Text>
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.timeText}>
              {task.estimated_minutes} min
            </Text>
          </View>

          {showDate && (
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.dateText}>
                {new Date(task.scheduled_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>
          )}

          {task.is_revision && (
            <LinearGradient
              colors={Colors.gradientPrimary as [string, string]}
              style={styles.revisionBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="refresh" size={10} color="#FFF" />
              <Text style={styles.revisionText}>Revision</Text>
            </LinearGradient>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
    overflow: 'hidden',
  },
  completedContainer: {
    opacity: 0.6,
    backgroundColor: Colors.backgroundLight,
  },
  priorityBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: BorderRadius.lg,
    borderBottomLeftRadius: BorderRadius.lg,
  },
  statusButton: {
    marginRight: Spacing.md,
    marginLeft: Spacing.xs,
    justifyContent: 'center',
  },
  pendingIcon: {
    opacity: 0.7,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
    lineHeight: 22,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  subjectBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  subjectText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },
  topic: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: Spacing.md,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  revisionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  revisionText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '600',
  },
});
