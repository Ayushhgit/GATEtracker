import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { DashboardData } from '@/types';
import {
  TaskCard,
  ProgressBar,
  StatCard,
  InsightCard,
  LoadingSpinner,
} from '@/components';
import { Colors, Spacing, FontSizes } from '@/constants';

export default function DashboardScreen() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchData = async () => {
    try {
      const dashboard = await api.getDashboard();
      setData(dashboard);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const handleTaskStatusChange = async (taskId: number, status: string) => {
    try {
      await api.updateTaskStatus(taskId, status as any);
      fetchData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update task');
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading dashboard..." />;
  }

  if (!data) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load dashboard</Text>
        <TouchableOpacity onPress={fetchData}>
          <Text style={styles.retryText}>Tap to retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header Stats */}
      <View style={styles.statsRow}>
        <StatCard
          title="Streak"
          value={`${data.current_streak}d`}
          icon="flame"
          iconColor={Colors.warning}
        />
        <View style={{ width: Spacing.sm }} />
        <StatCard
          title="Today"
          value={`${data.today_completed}/${data.today_total}`}
          icon="checkmark-circle"
          iconColor={Colors.success}
        />
        <View style={{ width: Spacing.sm }} />
        <StatCard
          title="Week"
          value={`${Math.round(data.week_completion_rate * 100)}%`}
          icon="calendar"
          iconColor={Colors.primary}
        />
      </View>

      {/* Today's Progress */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Progress</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/today')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          <ProgressBar
            progress={data.today_total > 0 ? data.today_completed / data.today_total : 0}
            label={`${data.today_completed} of ${data.today_total} tasks completed`}
            color={Colors.success}
          />
        </View>
      </View>

      {/* Today's Tasks */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Tasks</Text>
          <TouchableOpacity onPress={() => router.push('/task/new')}>
            <Ionicons name="add-circle" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        {data.today_tasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-done-circle" size={48} color={Colors.success} />
            <Text style={styles.emptyTitle}>No tasks for today!</Text>
            <Text style={styles.emptySubtitle}>Add a task or use the planner</Text>
          </View>
        ) : (
          data.today_tasks.slice(0, 3).map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onPress={() => router.push(`/task/${task.id}`)}
              onStatusChange={(status) => handleTaskStatusChange(task.id, status)}
            />
          ))
        )}
        {data.today_tasks.length > 3 && (
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => router.push('/(tabs)/today')}
          >
            <Text style={styles.moreText}>
              +{data.today_tasks.length - 3} more tasks
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Subject Overview */}
      {data.subjects_overview.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Subject Progress</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/progress')}>
              <Text style={styles.seeAll}>Details</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            {data.subjects_overview.slice(0, 4).map((subject) => (
              <View key={subject.subject_id} style={styles.subjectRow}>
                <View style={styles.subjectInfo}>
                  <View
                    style={[
                      styles.subjectDot,
                      { backgroundColor: subject.color },
                    ]}
                  />
                  <Text style={styles.subjectName} numberOfLines={1}>
                    {subject.subject_name}
                  </Text>
                </View>
                <View style={styles.subjectProgress}>
                  <ProgressBar
                    progress={subject.completion_rate}
                    showPercentage={false}
                    color={subject.color}
                    height={6}
                  />
                </View>
                <Text style={styles.subjectPercent}>
                  {Math.round(subject.completion_rate * 100)}%
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Recent Insights */}
      {data.recent_insights.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Insights</Text>
            {data.pending_insights > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{data.pending_insights}</Text>
              </View>
            )}
          </View>
          {data.recent_insights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onDismiss={() => api.markInsightRead(insight.id).then(fetchData)}
            />
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/planner')}
          >
            <Ionicons name="sparkles" size={24} color={Colors.primary} />
            <Text style={styles.actionText}>Generate Plan</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/chat')}
          >
            <Ionicons name="chatbubble-ellipses" size={24} color={Colors.secondary} />
            <Text style={styles.actionText}>Ask Mentor</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => api.generateInsights().then(fetchData)}
          >
            <Ionicons name="bulb" size={24} color={Colors.warning} />
            <Text style={styles.actionText}>Get Insights</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: Spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  seeAll: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.xl,
    alignItems: 'center',
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
  },
  moreButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  moreText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  subjectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
  },
  subjectDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  subjectName: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    flex: 1,
  },
  subjectProgress: {
    flex: 1,
    marginHorizontal: Spacing.sm,
  },
  subjectPercent: {
    width: 40,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  badge: {
    backgroundColor: Colors.error,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: Spacing.sm,
  },
  badgeText: {
    color: '#FFF',
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    alignItems: 'center',
    marginHorizontal: Spacing.xs,
  },
  actionText: {
    fontSize: FontSizes.xs,
    color: Colors.text,
    marginTop: Spacing.sm,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  retryText: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    marginTop: Spacing.md,
  },
});
