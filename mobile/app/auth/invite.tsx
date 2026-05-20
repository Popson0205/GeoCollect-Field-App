import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { Ionicons } from '@expo/vector-icons';

export default function AcceptInviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { acceptInvite, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const handleAccept = async () => {
    if (!token) return;
    if (!isAuthenticated) {
      router.push({ pathname: '/auth/login', params: { redirect: `/auth/invite?token=${token}` } });
      return;
    }
    setLoading(true);
    try {
      await acceptInvite(token);
      setAccepted(true);
      setTimeout(() => router.replace('/(app)/home'), 1500);
    } catch (e: any) {
      Alert.alert('Invite error', e?.response?.data?.message ?? 'This invite may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white items-center justify-center px-6">
      <View className="w-16 h-16 rounded-full bg-primary-100 items-center justify-center mb-6">
        <Ionicons name={accepted ? 'checkmark-circle' : 'mail-open'} size={32} color="#2563eb" />
      </View>
      <Text className="text-2xl font-bold text-gray-900 mb-2 text-center">
        {accepted ? 'You're in!' : 'Organization Invite'}
      </Text>
      <Text className="text-gray-500 text-center mb-8">
        {accepted
          ? 'You've joined the organization. Redirecting...'
          : 'You've been invited to join an organization on GeoCollect.'}
      </Text>
      {!accepted && (
        <TouchableOpacity
          className="bg-primary-600 rounded-xl py-4 px-8 w-full items-center"
          onPress={handleAccept}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-base">Accept Invitation</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
