import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? '/(app)/home' : '/auth/login'} />;
}
