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
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { Task, TaskStatus } from '@/types';
import { TaskCard, LoadingSpinner, ProgressBar } from '@/components';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants';

export default function TodayScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchTasks = async () => {
    try {
      const data = await api.getTodayTasks();
      setTasks(data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      Alert.alert('Error', 'Failed to load today\'s tasks');
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
      Alert.alert('Error', 'Failed to update task status');
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
    <LinearGradient colors={Colors.gradientDark as [string, string]} style={styles.container}>
      {/* Progress Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={[Colors.surfaceLight, Colors.surface]}
          style={styles.progressCard}
        >
          <View style={styles.progressInfo}>
            <Text style={styles.progressTitle}>Today's Progress</Text>
            <Text style={styles.progressSubtitle}>
              {completedCount} of {totalCount} tasks completed
            </Text>
          </View>
          <LinearGradient
            colors={progress >= 1 ? Colors.gradientSuccess as [string, string] : Colors.gradientPrimary as [string, string]}
            style={styles.progressCircle}
          >
            <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
          </LinearGradient>
        </LinearGradient>
        <View style={styles.progressBarContainer}>
          <ProgressBar
            progress={progress}
            showPercentage={false}
            height={8}
            gradientColors={Colors.gradientSuccess as [string, string]}
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
            <LinearGradient
              colors={[Colors.success + '30', Colors.success + '10']}
              style={styles.emptyIconContainer}
            >
              <Ionicons name="calendar-outline" size={64} color={Colors.success} />
            </LinearGradient>
            <Text style={styles.emptyTitle}>No tasks for today</Text>
            <Text style={styles.emptySubtitle}>
              Add a task or use the AI planner to generate tasks
            </Text>
            <TouchableOpacity
              style={styles.addButtonEmpty}
              onPress={() => router.push('/task/new')}
            >
              <LinearGradient
                colors={Colors.gradientPrimary as [string, string]}
                style={styles.addButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="add" size={20} color="#FFF" />
                <Text style={styles.addButtonText}>Add Task</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item, index }) => {
          // Section headers
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
                <View style={styles.sectionHeaderRow}>
                  <View style={[styles.sectionDot, { backgroundColor: Colors.pending }]} />
                  <Text style={styles.sectionHeader}>
                    Pending ({pendingTasks.length})
                  </Text>
                </View>
              )}
              {showSkippedHeader && (
                <View style={styles.sectionHeaderRow}>
                  <View style={[styles.sectionDot, { backgroundColor: Colors.error }]} />
                  <Text style={[styles.sectionHeader, { color: Colors.error }]}>
                    Skipped ({skippedTasks.length})
                  </Text>
                </View>
              )}
              {showCompletedHeader && (
                <View style={styles.sectionHeaderRow}>
                  <View style={[styles.sectionDot, { backgroundColor: Colors.success }]} />
                  <Text style={[styles.sectionHeader, { color: Colors.success }]}>
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
        style={styles.fab}
        onPress={() => router.push('/task/new')}
      >
        <LinearGradient
          colors={Colors.gradientPrimary as [string, string]}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="add" size={28} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  progressCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  progressInfo: {
    flex: 1,
  },
  progressTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  progressSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  progressCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPercent: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: '#FFF',
  },
  progressBarContainer: {
    marginTop: Spacing.xs,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  sectionHeader: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  addButtonEmpty: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  addButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
