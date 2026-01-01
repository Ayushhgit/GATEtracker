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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/services/api';
import { DashboardData } from '@/types';
import {
  TaskCard,
  ProgressBar,
  StatCard,
  InsightCard,
  LoadingSpinner,
} from '@/components';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants';

export default function DashboardScreen() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const fetchData = async () => {
    try {
      const dashboard = await api.getDashboard();
      setData(dashboard);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
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

  const handleClearAllInsights = () => {
    Alert.alert(
      'Clear All Insights',
      'Are you sure you want to clear all insights?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.clearAllInsights();
              fetchData();
            } catch (error) {
              Alert.alert('Error', 'Failed to clear insights');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading..." />;
  }

  if (!data) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Ionicons name="cloud-offline-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.errorText}>Failed to load dashboard</Text>
        <TouchableOpacity onPress={fetchData} style={styles.retryButton}>
          <Text style={styles.retryText}>Tap to retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const progress = data.today_total > 0 ? data.today_completed / data.today_total : 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good {getTimeOfDay()}</Text>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/task/new')}
            style={styles.addButton}
          >
            <Ionicons name="add" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Today's Progress</Text>
            <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
          </View>
          <ProgressBar
            progress={progress}
            showPercentage={false}
            color={Colors.primary}
            height={8}
          />
          <Text style={styles.progressSubtext}>
            {data.today_completed} of {data.today_total} tasks completed
          </Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatCard
            title="Streak"
            value={`${data.current_streak}d`}
            icon="flame"
            iconColor={Colors.warning}
            compact
          />
          <StatCard
            title="This Week"
            value={`${Math.round(data.week_completion_rate * 100)}%`}
            icon="trending-up"
            iconColor={Colors.success}
            compact
          />
        </View>

        {/* Today's Tasks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Tasks</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/today')}>
              <Text style={styles.seeAll}>View All</Text>
            </TouchableOpacity>
          </View>

          {data.today_tasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={40} color={Colors.success} />
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySubtitle}>No tasks scheduled for today</Text>
            </View>
          ) : (
            <>
              {data.today_tasks.slice(0, 3).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onPress={() => router.push(`/task/${task.id}`)}
                  onStatusChange={(status) => handleTaskStatusChange(task.id, status)}
                  compact
                />
              ))}
              {data.today_tasks.length > 3 && (
                <TouchableOpacity
                  style={styles.moreButton}
                  onPress={() => router.push('/(tabs)/today')}
                >
                  <Text style={styles.moreText}>
                    +{data.today_tasks.length - 3} more
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Subject Progress */}
        {data.subjects_overview.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Subjects</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/progress')}>
                <Text style={styles.seeAll}>Details</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.subjectsCard}>
              {data.subjects_overview.slice(0, 4).map((subject) => (
                <View key={subject.subject_id} style={styles.subjectRow}>
                  <View style={[styles.subjectDot, { backgroundColor: subject.color }]} />
                  <Text style={styles.subjectName} numberOfLines={1}>
                    {subject.subject_name}
                  </Text>
                  <Text style={styles.subjectPercent}>
                    {Math.round(subject.completion_rate * 100)}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Insights */}
        {data.recent_insights.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Insights</Text>
                {data.pending_insights > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{data.pending_insights}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={handleClearAllInsights}>
                <Text style={styles.clearAll}>Clear All</Text>
              </TouchableOpacity>
            </View>
            {data.recent_insights.slice(0, 2).map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onDismiss={() => api.deleteInsight(insight.id).then(fetchData)}
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
              <View style={[styles.actionIcon, { backgroundColor: Colors.primaryMuted }]}>
                <Ionicons name="sparkles" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.actionText}>AI Planner</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/(tabs)/chat')}
            >
              <View style={[styles.actionIcon, { backgroundColor: Colors.accentMuted }]}>
                <Ionicons name="chatbubble-ellipses" size={20} color={Colors.accent} />
              </View>
              <Text style={styles.actionText}>Mentor</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => api.generateInsights().then(fetchData)}
            >
              <View style={[styles.actionIcon, { backgroundColor: Colors.warningMuted }]}>
                <Ionicons name="bulb" size={20} color={Colors.warning} />
              </View>
              <Text style={styles.actionText}>Insights</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  greeting: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text,
    textTransform: 'capitalize',
  },
  dateText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  progressCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  progressTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  progressPercent: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.primary,
  },
  progressSubtext: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  seeAll: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '500',
  },
  clearAll: {
    fontSize: FontSizes.sm,
    color: Colors.error,
    fontWeight: '500',
  },
  badge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: Colors.text,
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyTitle: {
    fontSize: FontSizes.md,
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
    paddingVertical: Spacing.md,
  },
  moreText: {
    color: Colors.primary,
    fontWeight: '500',
    fontSize: FontSizes.sm,
  },
  subjectsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  subjectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.md,
  },
  subjectName: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  subjectPercent: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  actionText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: '500',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  retryButton: {
    marginTop: Spacing.md,
  },
  retryText: {
    fontSize: FontSizes.md,
    color: Colors.primary,
    fontWeight: '500',
  },
});
