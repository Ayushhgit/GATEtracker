import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { ChatMessage } from '@/types';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants';

interface Message extends ChatMessage {
  id: string;
  isLoading?: boolean;
  actionTaken?: string;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  // Quick prompts - including delete examples
  const quickPrompts = [
    "What should I study today?",
    "Delete all pending tasks for today",
    "Show my tasks",
    "Replan my week",
  ];

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await api.sendMessage(text, sessionId || undefined);
      setSessionId(response.session_id);

      // Remove loading message and add response
      setMessages((prev) => {
        const filtered = prev.filter((m) => !m.isLoading);
        return [
          ...filtered,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: response.response,
            timestamp: new Date().toISOString(),
            actionTaken: response.action_taken || undefined,
          },
        ];
      });

      // Show action notification
      if (response.action_taken) {
        const isDelete = response.action_taken.toLowerCase().includes('deleted');
        const isCreate = response.action_taken.toLowerCase().includes('created');
        const isUpdate = response.action_taken.toLowerCase().includes('updated') ||
                        response.action_taken.toLowerCase().includes('rescheduled');

        Alert.alert(
          isDelete ? 'Tasks Deleted' : isCreate ? 'Tasks Created' : isUpdate ? 'Tasks Updated' : 'Action Completed',
          response.action_taken,
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Failed to send message:', error);
      setMessages((prev) => prev.filter((m) => !m.isLoading));
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'Failed to get response from mentor'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    Alert.alert(
      'New Chat',
      'Start a new conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: () => {
            setMessages([]);
            setSessionId(null);
          },
        },
      ]
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';

    if (item.isLoading) {
      return (
        <View style={[styles.messageBubble, styles.assistantBubble]}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>Thinking...</Text>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        {isUser ? (
          <LinearGradient
            colors={Colors.gradientPrimary as [string, string]}
            style={styles.userBubbleGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={[styles.messageText, styles.userMessageText]}>
              {item.content}
            </Text>
          </LinearGradient>
        ) : (
          <>
            <View style={styles.mentorHeader}>
              <LinearGradient
                colors={Colors.gradientPrimary as [string, string]}
                style={styles.mentorIconBg}
              >
                <Ionicons name="school" size={12} color="#FFF" />
              </LinearGradient>
              <Text style={styles.mentorLabel}>GATE Mentor</Text>
            </View>
            <Text style={styles.messageText}>
              {item.content}
            </Text>
            {item.actionTaken && (
              <View style={styles.actionBadge}>
                <Ionicons
                  name={item.actionTaken.includes('Deleted') ? 'trash' :
                        item.actionTaken.includes('Created') ? 'add-circle' :
                        'checkmark-circle'}
                  size={14}
                  color={Colors.success}
                />
                <Text style={styles.actionBadgeText}>{item.actionTaken}</Text>
              </View>
            )}
          </>
        )}
      </View>
    );
  };

  return (
    <LinearGradient colors={Colors.gradientDark as [string, string]} style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <LinearGradient
              colors={Colors.gradientPrimary as [string, string]}
              style={styles.mentorAvatar}
            >
              <Ionicons name="school" size={24} color="#FFF" />
            </LinearGradient>
            <View>
              <Text style={styles.headerTitle}>GATE Mentor</Text>
              <Text style={styles.headerSubtitle}>Can create, edit & delete tasks</Text>
            </View>
          </View>
          <TouchableOpacity onPress={startNewChat} style={styles.newChatButton}>
            <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={[Colors.primary + '30', Colors.primary + '10']}
              style={styles.emptyIconContainer}
            >
              <Ionicons name="chatbubbles-outline" size={64} color={Colors.primary} />
            </LinearGradient>
            <Text style={styles.emptyTitle}>Chat with your GATE Mentor</Text>
            <Text style={styles.emptySubtitle}>
              Ask questions, create tasks, or delete existing ones
            </Text>

            <View style={styles.quickPrompts}>
              <Text style={styles.quickPromptsTitle}>Try asking:</Text>
              {quickPrompts.map((prompt, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickPrompt}
                  onPress={() => sendMessage(prompt)}
                >
                  <Text style={styles.quickPromptText}>{prompt}</Text>
                  <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.helpSection}>
              <Text style={styles.helpTitle}>You can say things like:</Text>
              <Text style={styles.helpText}>• "Delete the DSA task for tomorrow"</Text>
              <Text style={styles.helpText}>• "Remove all OS tasks this week"</Text>
              <Text style={styles.helpText}>• "Create a new task for DBMS revision"</Text>
              <Text style={styles.helpText}>• "Reschedule today's tasks to next week"</Text>
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
          />
        )}

        {/* Quick Actions when chatting */}
        {messages.length > 0 && (
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => sendMessage("Show my tasks for today")}
            >
              <Text style={styles.quickActionText} numberOfLines={1}>
                Show tasks
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => sendMessage("What should I focus on?")}
            >
              <Text style={styles.quickActionText} numberOfLines={1}>
                Focus advice
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, styles.quickActionDanger]}
              onPress={() => sendMessage("Delete completed tasks")}
            >
              <Text style={[styles.quickActionText, styles.quickActionDangerText]} numberOfLines={1}>
                Clean up
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Input */}
        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
          <TextInput
            style={styles.input}
            placeholder="Ask your mentor or request changes..."
            placeholderTextColor={Colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isLoading}
          >
            <LinearGradient
              colors={inputText.trim() && !isLoading
                ? Colors.gradientPrimary as [string, string]
                : [Colors.border, Colors.border]}
              style={styles.sendButtonGradient}
            >
              <Ionicons
                name="send"
                size={20}
                color={inputText.trim() && !isLoading ? '#FFF' : Colors.textMuted}
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mentorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  newChatButton: {
    padding: Spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
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
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  quickPrompts: {
    marginTop: Spacing.lg,
    width: '100%',
  },
  quickPromptsTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  quickPrompt: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickPromptText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    flex: 1,
  },
  helpSection: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.primary + '15',
    borderRadius: BorderRadius.md,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  helpTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  helpText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  messageList: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  messageBubble: {
    maxWidth: '85%',
    marginBottom: Spacing.sm,
  },
  userBubble: {
    alignSelf: 'flex-end',
    overflow: 'hidden',
    borderRadius: BorderRadius.lg,
    borderBottomRightRadius: 4,
  },
  userBubbleGradient: {
    padding: Spacing.md,
  },
  assistantBubble: {
    backgroundColor: Colors.surface,
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.lg,
    borderBottomLeftRadius: 4,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mentorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  mentorIconBg: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mentorLabel: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 6,
  },
  messageText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFF',
  },
  loadingText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionBadgeText: {
    fontSize: FontSizes.xs,
    color: Colors.success,
    fontWeight: '600',
    marginLeft: 4,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  quickAction: {
    flex: 1,
    backgroundColor: Colors.backgroundLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  quickActionDanger: {
    backgroundColor: Colors.error + '20',
  },
  quickActionText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    textAlign: 'center',
    fontWeight: '500',
  },
  quickActionDangerText: {
    color: Colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendButton: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  sendButtonGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
