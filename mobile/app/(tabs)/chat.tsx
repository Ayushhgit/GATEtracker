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

  const quickPrompts = [
    "What should I study today?",
    "Delete all pending tasks",
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

      if (response.action_taken) {
        Alert.alert('Action Completed', response.action_taken, [{ text: 'OK' }]);
      }
    } catch (error: any) {
      setMessages((prev) => prev.filter((m) => !m.isLoading));
      Alert.alert('Error', 'Failed to get response');
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    Alert.alert('New Chat', 'Start a new conversation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes',
        onPress: () => {
          setMessages([]);
          setSessionId(null);
        },
      },
    ]);
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
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {!isUser && (
          <View style={styles.mentorHeader}>
            <View style={styles.mentorIcon}>
              <Ionicons name="school" size={12} color={Colors.primary} />
            </View>
            <Text style={styles.mentorLabel}>GATE Mentor</Text>
          </View>
        )}
        <Text style={[styles.messageText, isUser && styles.userMessageText]}>
          {item.content}
        </Text>
        {item.actionTaken && (
          <View style={styles.actionBadge}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
            <Text style={styles.actionBadgeText}>{item.actionTaken}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
          <View style={styles.headerInfo}>
            <View style={styles.avatarContainer}>
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

        {/* Messages or Empty State */}
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="chatbubbles-outline" size={48} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Ask your GATE Mentor</Text>
            <Text style={styles.emptySubtitle}>
              Get study advice, manage tasks, or ask questions
            </Text>

            <View style={styles.quickPrompts}>
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
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {/* Quick Actions */}
        {messages.length > 0 && (
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => sendMessage("Show my tasks for today")}
            >
              <Text style={styles.quickActionText}>Show tasks</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => sendMessage("What should I focus on?")}
            >
              <Text style={styles.quickActionText}>Focus advice</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, styles.quickActionDanger]}
              onPress={() => sendMessage("Delete completed tasks")}
            >
              <Text style={[styles.quickActionText, { color: Colors.error }]}>Clean up</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Input */}
        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
          <TextInput
            style={styles.input}
            placeholder="Ask anything..."
            placeholderTextColor={Colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[styles.sendButton, inputText.trim() && !isLoading && styles.sendButtonActive]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() && !isLoading ? Colors.text : Colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.backgroundElevated,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
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
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryMuted,
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
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  quickPrompts: {
    marginTop: Spacing.xl,
    width: '100%',
  },
  quickPrompt: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickPromptText: {
    fontSize: FontSizes.md,
    color: Colors.text,
    flex: 1,
  },
  messageList: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  messageBubble: {
    maxWidth: '85%',
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderBottomRightRadius: BorderRadius.xs,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: BorderRadius.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mentorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  mentorIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: Colors.text,
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.backgroundElevated,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  quickAction: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActionDanger: {
    backgroundColor: Colors.errorMuted,
    borderColor: Colors.error + '30',
  },
  quickActionText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.backgroundElevated,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
});
