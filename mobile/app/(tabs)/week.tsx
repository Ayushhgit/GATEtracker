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
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { api } from '@/services/api';
import { Task, TaskStatus } from '@/types';
import { TaskCard, LoadingSpinner, ProgressBar } from '@/components';
import { Colors, Spacing, FontSizes } from '@/constants';

export default function WeekScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const router = useRouter();

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
      {/* Week Navigation */}
      <View style={styles.weekNav}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => setWeekOffset(weekOffset - 1)}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
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
            <Text style={styles.currentWeek}>This Week</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => setWeekOffset(weekOffset + 1)}
        >
          <Ionicons name="chevron-forward" size={24} color={Colors.text} />
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
                todayDate && styles.dayCardToday,
              ]}
              onPress={() => setSelectedDate(date)}
            >
              <Text
                style={[
                  styles.dayName,
                  isSelected && styles.dayNameSelected,
                ]}
              >
                {format(date, 'EEE')}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  isSelected && styles.dayNumberSelected,
                ]}
              >
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
                          ? '#FFF'
                          : stats.rate === 1
                          ? Colors.success
                          : Colors.primary,
                      },
                    ]}
                  />
                </View>
              )}
              <Text
                style={[
                  styles.dayCount,
                  isSelected && styles.dayCountSelected,
                ]}
              >
                {stats.completed}/{stats.total}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Selected Day Tasks */}
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
        >
          <Ionicons name="add-circle" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.taskList}
        contentContainerStyle={styles.taskListContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {selectedTasks.length === 0 ? (
          <View style={styles.emptyDay}>
            <Ionicons name="sunny-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyDayText}>No tasks scheduled</Text>
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
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  navButton: {
    padding: Spacing.sm,
  },
  weekTitle: {
    alignItems: 'center',
  },
  weekTitleText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  currentWeek: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    marginTop: 2,
  },
  daySelector: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  daySelectorContent: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  dayCard: {
    width: 60,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    marginHorizontal: Spacing.xs,
    borderRadius: 12,
    backgroundColor: Colors.background,
  },
  dayCardSelected: {
    backgroundColor: Colors.primary,
  },
  dayCardToday: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  dayName: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  dayNameSelected: {
    color: '#FFF',
  },
  dayNumber: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginVertical: 4,
  },
  dayNumberSelected: {
    color: '#FFF',
  },
  dayProgress: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginVertical: 4,
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
    color: '#FFF',
  },
  selectedDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  selectedDayTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  taskList: {
    flex: 1,
  },
  taskListContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  emptyDay: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyDayText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  addTaskButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  addTaskButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
});
