import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, BorderRadius } from '@/constants';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.backgroundElevated,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          height: 56 + (insets.bottom > 0 ? insets.bottom : 8),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
        },
        headerStyle: {
          backgroundColor: Colors.background,
        },
        headerShadowVisible: false,
        headerTintColor: Colors.text,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              backgroundColor: Colors.primaryMuted,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: BorderRadius.md,
            } : undefined}>
              <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              backgroundColor: Colors.primaryMuted,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: BorderRadius.md,
            } : undefined}>
              <Ionicons name={focused ? "today" : "today-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="week"
        options={{
          title: 'Week',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              backgroundColor: Colors.primaryMuted,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: BorderRadius.md,
            } : undefined}>
              <Ionicons name={focused ? "calendar" : "calendar-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Stats',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              backgroundColor: Colors.primaryMuted,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: BorderRadius.md,
            } : undefined}>
              <Ionicons name={focused ? "stats-chart" : "stats-chart-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Mentor',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              backgroundColor: Colors.primaryMuted,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: BorderRadius.md,
            } : undefined}>
              <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
