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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { ChatMessage } from '@/types';
import { Colors, Spacing, FontSizes } from '@/constants';

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
        {!isUser && (
          <View style={styles.mentorHeader}>
            <Ionicons name="school" size={16} color={Colors.primary} />
            <Text style={styles.mentorLabel}>GATE Mentor</Text>
          </View>
        )}
        <Text
          style={[
            styles.messageText,
            isUser && styles.userMessageText,
          ]}
        >
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
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <View style={styles.mentorAvatar}>
            <Ionicons name="school" size={24} color={Colors.primary} />
          </View>
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
          <Ionicons name="chatbubbles-outline" size={64} color={Colors.textLight} />
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
          placeholderTextColor={Colors.textLight}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={1000}
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
          ]}
          onPress={() => sendMessage(inputText)}
          disabled={!inputText.trim() || isLoading}
        >
          <Ionicons
            name="send"
            size={20}
            color={inputText.trim() && !isLoading ? '#FFF' : Colors.textLight}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.primary + '15',
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
    borderRadius: 10,
    marginBottom: Spacing.sm,
  },
  quickPromptText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    flex: 1,
  },
  helpSection: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.primary + '10',
    borderRadius: 10,
    width: '100%',
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
    padding: Spacing.md,
    borderRadius: 16,
    marginBottom: Spacing.sm,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: Colors.surface,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  mentorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  mentorLabel: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 4,
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
  },
  quickAction: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 16,
    marginHorizontal: Spacing.xs,
  },
  quickActionDanger: {
    backgroundColor: Colors.error + '15',
  },
  quickActionText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    textAlign: 'center',
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
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.text,
    maxHeight: 100,
    marginRight: Spacing.sm,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.border,
  },
});
