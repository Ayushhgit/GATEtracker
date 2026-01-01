import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
          height: 65 + (insets.bottom > 0 ? insets.bottom : 12),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        headerStyle: {
          backgroundColor: Colors.background,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTintColor: Colors.text,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 20,
        },
        headerBackground: () => (
          <LinearGradient
            colors={[Colors.backgroundLight, Colors.background]}
            style={{ flex: 1 }}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              backgroundColor: color + '20',
              padding: 8,
              borderRadius: 12,
            } : { padding: 8 }}>
              <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              backgroundColor: color + '20',
              padding: 8,
              borderRadius: 12,
            } : { padding: 8 }}>
              <Ionicons name={focused ? "today" : "today-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="week"
        options={{
          title: 'Week',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              backgroundColor: color + '20',
              padding: 8,
              borderRadius: 12,
            } : { padding: 8 }}>
              <Ionicons name={focused ? "calendar" : "calendar-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              backgroundColor: color + '20',
              padding: 8,
              borderRadius: 12,
            } : { padding: 8 }}>
              <Ionicons name={focused ? "stats-chart" : "stats-chart-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Mentor',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              backgroundColor: color + '20',
              padding: 8,
              borderRadius: 12,
            } : { padding: 8 }}>
              <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
