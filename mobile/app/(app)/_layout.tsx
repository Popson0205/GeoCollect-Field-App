import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSubmissionStore } from '../../src/store/submissionStore';
import { View, Text } from 'react-native';

function BadgeIcon({ name, color, size, count }: { name: any; color: string; size: number; count?: number }) {
  return (
    <View>
      <Ionicons name={name} size={size} color={color} />
      {count != null && count > 0 && (
        <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[16px] h-4 items-center justify-center px-1">
          <Text className="text-white text-[10px] font-bold">{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </View>
  );
}

export default function AppLayout() {
  const { pendingCount } = useSubmissionStore();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingBottom: 4,
          height: 60,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="forms"
        options={{
          title: 'Forms',
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="submissions"
        options={{
          title: 'Submissions',
          tabBarIcon: ({ color, size }) => (
            <BadgeIcon name="cloud-upload" size={size} color={color} count={pendingCount} />
          ),
        }}
      />
      <Tabs.Screen
        name="org"
        options={{
          title: 'Team',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
