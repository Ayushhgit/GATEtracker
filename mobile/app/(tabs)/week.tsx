import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { api } from '@/services/api';
import { Task, TaskStatus } from '@/types';
import { TaskCard, LoadingSpinner } from '@/components';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants';

export default function WeekScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const fetchTasks = async () => {
    try {
      const data = await api.getWeekTasks(weekOffset);
      setTasks(data);
    } catch (error) {
      console.error('Failed to fetch week tasks:', error);
      Alert.alert('Error', 'Failed to load week tasks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [weekOffset]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTasks();
  }, [weekOffset]);

  const handleStatusChange = async (taskId: number, status: TaskStatus) => {
    try {
      await api.updateTaskStatus(taskId, status);
      fetchTasks();
    } catch (error) {
      Alert.alert('Error', 'Failed to update task status');
    }
  };

  // Calculate week dates
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 }); // Monday
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Group tasks by date
  const tasksByDate: Record<string, Task[]> = {};
  weekDates.forEach((date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    tasksByDate[dateStr] = tasks.filter((t) => t.scheduled_date === dateStr);
  });

  // Calculate daily stats
  const getDayStats = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayTasks = tasksByDate[dateStr] || [];
    const completed = dayTasks.filter((t) => t.status === 'completed').length;
    const total = dayTasks.length;
    return { completed, total, rate: total > 0 ? completed / total : 0 };
  };

  // Selected date tasks
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const selectedTasks = tasksByDate[selectedDateStr] || [];

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading week..." />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Week</Text>
          <Text style={styles.headerSubtitle}>Plan your study schedule</Text>
        </View>
      </View>

      {/* Week Navigation */}
      <View style={styles.weekNav}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => setWeekOffset(weekOffset - 1)}
        >
          <Ionicons name="chevron-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.weekTitle}
          onPress={() => {
            setWeekOffset(0);
            setSelectedDate(new Date());
          }}
        >
          <Text style={styles.weekTitleText}>
            {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </Text>
          {weekOffset === 0 && (
            <View style={styles.currentWeekBadge}>
              <Text style={styles.currentWeek}>This Week</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => setWeekOffset(weekOffset + 1)}
        >
          <Ionicons name="chevron-forward" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Day Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.daySelector}
        contentContainerStyle={styles.daySelectorContent}
      >
        {weekDates.map((date) => {
          const stats = getDayStats(date);
          const isSelected = isSameDay(date, selectedDate);
          const todayDate = isToday(date);

          return (
            <TouchableOpacity
              key={date.toISOString()}
              style={[
                styles.dayCard,
                isSelected && styles.dayCardSelected,
                todayDate && !isSelected && styles.dayCardToday,
              ]}
              onPress={() => setSelectedDate(date)}
            >
              <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>
                {format(date, 'EEE')}
              </Text>
              <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>
                {format(date, 'd')}
              </Text>
              {stats.total > 0 && (
                <View style={styles.dayProgress}>
                  <View
                    style={[
                      styles.dayProgressFill,
                      {
                        width: `${stats.rate * 100}%`,
                        backgroundColor: isSelected
                          ? Colors.text
                          : stats.rate === 1
                          ? Colors.success
                          : Colors.primary,
                      },
                    ]}
                  />
                </View>
              )}
              <Text style={[styles.dayCount, isSelected && styles.dayCountSelected]}>
                {stats.completed}/{stats.total}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Selected Day Header */}
      <View style={styles.selectedDayHeader}>
        <Text style={styles.selectedDayTitle}>
          {isToday(selectedDate)
            ? 'Today'
            : format(selectedDate, 'EEEE, MMMM d')}
        </Text>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: '/task/new',
              params: { date: selectedDateStr },
            })
          }
          style={styles.addButton}
        >
          <Ionicons name="add" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Task List */}
      <ScrollView
        style={styles.taskList}
        contentContainerStyle={styles.taskListContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {selectedTasks.length === 0 ? (
          <View style={styles.emptyDay}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="sunny-outline" size={48} color={Colors.primary} />
            </View>
            <Text style={styles.emptyDayTitle}>No tasks scheduled</Text>
            <Text style={styles.emptyDayText}>Add a task to get started</Text>
            <TouchableOpacity
              style={styles.addTaskButton}
              onPress={() =>
                router.push({
                  pathname: '/task/new',
                  params: { date: selectedDateStr },
                })
              }
            >
              <Text style={styles.addTaskButtonText}>Add Task</Text>
            </TouchableOpacity>
          </View>
        ) : (
          selectedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onPress={() => router.push(`/task/${task.id}`)}
              onStatusChange={(status) => handleStatusChange(task.id, status)}
            />
          ))
        )}
      </ScrollView>
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
    paddingBottom: Spacing.md,
  },
  headerContent: {
    marginBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.backgroundElevated,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  weekTitle: {
    alignItems: 'center',
  },
  weekTitleText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  currentWeekBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginTop: 4,
  },
  currentWeek: {
    fontSize: FontSizes.xs,
    color: Colors.text,
    fontWeight: '600',
  },
  daySelector: {
    backgroundColor: Colors.backgroundElevated,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  daySelectorContent: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  dayCard: {
    width: 64,
    marginHorizontal: Spacing.xs,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayCardSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayCardToday: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  dayName: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  dayNameSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  dayNumber: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginVertical: 4,
  },
  dayNumberSelected: {
    color: Colors.text,
  },
  dayProgress: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginVertical: 4,
    overflow: 'hidden',
  },
  dayProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  dayCount: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  dayCountSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  selectedDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  selectedDayTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskList: {
    flex: 1,
  },
  taskListContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  emptyDay: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyDayTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  emptyDayText: {
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
  addTaskButtonText: {
    color: Colors.text,
    fontWeight: '600',
    fontSize: FontSizes.md,
  },
});
