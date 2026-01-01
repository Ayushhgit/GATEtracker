import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/services/api';
import { Task, TaskStatus } from '@/types';
import { TaskCard, LoadingSpinner, ProgressBar } from '@/components';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants';

export default function TodayScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const fetchTasks = async () => {
    try {
      const data = await api.getTodayTasks();
      setTasks(data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTasks();
  }, []);

  const handleStatusChange = async (taskId: number, status: TaskStatus) => {
    try {
      await api.updateTaskStatus(taskId, status);
      fetchTasks();
    } catch (error) {
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  const pendingTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const skippedTasks = tasks.filter((t) => t.status === 'skipped');

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading tasks..." />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Today</Text>
          <Text style={styles.headerDate}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>

        {/* Progress */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              {completedCount} of {totalCount} completed
            </Text>
            <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
          </View>
          <ProgressBar
            progress={progress}
            showPercentage={false}
            color={progress >= 1 ? Colors.success : Colors.primary}
            height={6}
          />
        </View>
      </View>

      {/* Task List */}
      <FlatList
        data={[...pendingTasks, ...skippedTasks, ...completedTasks]}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="checkmark-circle-outline" size={48} color={Colors.success} />
            </View>
            <Text style={styles.emptyTitle}>No tasks for today</Text>
            <Text style={styles.emptySubtitle}>
              Add a task or use the AI planner
            </Text>
            <TouchableOpacity
              style={styles.addTaskButton}
              onPress={() => router.push('/task/new')}
            >
              <Text style={styles.addTaskText}>Add Task</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item, index }) => {
          const showPendingHeader = index === 0 && pendingTasks.length > 0;
          const showSkippedHeader =
            item.status === 'skipped' &&
            index === pendingTasks.length &&
            skippedTasks.length > 0;
          const showCompletedHeader =
            item.status === 'completed' &&
            index === pendingTasks.length + skippedTasks.length &&
            completedTasks.length > 0;

          return (
            <>
              {showPendingHeader && (
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionDot, { backgroundColor: Colors.warning }]} />
                  <Text style={styles.sectionLabel}>Pending ({pendingTasks.length})</Text>
                </View>
              )}
              {showSkippedHeader && (
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionDot, { backgroundColor: Colors.error }]} />
                  <Text style={[styles.sectionLabel, { color: Colors.error }]}>
                    Skipped ({skippedTasks.length})
                  </Text>
                </View>
              )}
              {showCompletedHeader && (
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionDot, { backgroundColor: Colors.success }]} />
                  <Text style={[styles.sectionLabel, { color: Colors.success }]}>
                    Completed ({completedTasks.length})
                  </Text>
                </View>
              )}
              <TaskCard
                task={item}
                onPress={() => router.push(`/task/${item.id}`)}
                onStatusChange={(status) => handleStatusChange(item.id, status)}
              />
            </>
          );
        }}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: Spacing.xl }]}
        onPress={() => router.push('/task/new')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={Colors.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.backgroundElevated,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerContent: {
    marginBottom: Spacing.lg,
  },
  headerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text,
  },
  headerDate: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  progressSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  progressLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  progressPercent: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.primary,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  sectionLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.successMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  addTaskButton: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  addTaskText: {
    color: Colors.text,
    fontWeight: '600',
    fontSize: FontSizes.md,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
