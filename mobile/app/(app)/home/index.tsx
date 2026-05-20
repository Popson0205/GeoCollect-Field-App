import React, { useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/authStore';
import { useFormStore } from '../../../src/store/formStore';
import { useSubmissionStore } from '../../../src/store/submissionStore';
import { triggerForegroundSync } from '../../../src/services/sync';
import { Form } from '../../../src/types';

function FormCard({ form, onPress }: { form: Form; onPress: () => void }) {
  return (
    <TouchableOpacity
      className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <Text className="font-semibold text-gray-900 text-base mb-1" numberOfLines={2}>
            {form.title}
          </Text>
          {form.description && (
            <Text className="text-gray-500 text-sm mb-2" numberOfLines={2}>
              {form.description}
            </Text>
          )}
          <View className="flex-row items-center gap-x-3">
            <View className="flex-row items-center">
              <Ionicons name="layers-outline" size={13} color="#6b7280" />
              <Text className="text-gray-500 text-xs ml-1">{form.fields.length} fields</Text>
            </View>
            {form.geofence && (
              <View className="flex-row items-center">
                <Ionicons name="location-outline" size={13} color="#2563eb" />
                <Text className="text-primary-600 text-xs ml-1">Geofenced</Text>
              </View>
            )}
          </View>
        </View>
        <View className="w-10 h-10 rounded-xl bg-primary-50 items-center justify-center">
          <Ionicons name="chevron-forward" size={18} color="#2563eb" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { user, memberships } = useAuthStore();
  const { forms, isLoading: formsLoading, loadLocalForms, syncForms } = useFormStore();
  const { pendingCount, loadSubmissions, syncPending, isSyncing } = useSubmissionStore();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    loadLocalForms();
    loadSubmissions();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([syncForms(), triggerForegroundSync()]);
      await loadSubmissions();
    } finally {
      setRefreshing(false);
    }
  }, []);

  const recentForms = forms.slice(0, 5);

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View className="bg-primary-600 px-6 pt-14 pb-8">
        <Text className="text-white text-lg font-medium mb-1">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},
        </Text>
        <Text className="text-white text-2xl font-bold">
          {user?.full_name.split(' ')[0] ?? 'Field Worker'}
        </Text>
        {memberships.length > 0 && (
          <Text className="text-primary-200 text-sm mt-1">
            {memberships.map((m) => m.org_name).join(' · ')}
          </Text>
        )}
      </View>

      {/* Stats Cards */}
      <View className="flex-row px-4 -mt-5 gap-x-3 mb-6">
        <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <Text className="text-3xl font-bold text-gray-900">{forms.length}</Text>
          <Text className="text-gray-500 text-sm mt-1">Assigned forms</Text>
        </View>
        <TouchableOpacity
          className={`flex-1 rounded-2xl p-4 shadow-sm border ${pendingCount > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-100'}`}
          onPress={() => router.push('/(app)/submissions')}
        >
          <Text className={`text-3xl font-bold ${pendingCount > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
            {pendingCount}
          </Text>
          <Text className={`text-sm mt-1 ${pendingCount > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
            Pending sync
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sync Banner */}
      {pendingCount > 0 && (
        <TouchableOpacity
          className="mx-4 mb-4 bg-orange-500 rounded-2xl px-4 py-3 flex-row items-center"
          onPress={() => syncPending()}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="cloud-upload-outline" size={20} color="white" />
          )}
          <Text className="text-white font-medium ml-2">
            {isSyncing ? 'Syncing...' : `Sync ${pendingCount} pending submission${pendingCount > 1 ? 's' : ''}`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Recent Forms */}
      <View className="px-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-bold text-gray-900">Your forms</Text>
          <TouchableOpacity onPress={() => router.push('/(app)/forms')}>
            <Text className="text-primary-600 text-sm font-medium">See all</Text>
          </TouchableOpacity>
        </View>

        {formsLoading ? (
          <View className="items-center py-8">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-gray-500 mt-3">Loading forms...</Text>
          </View>
        ) : recentForms.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center border border-gray-100">
            <Ionicons name="document-text-outline" size={40} color="#d1d5db" />
            <Text className="text-gray-500 mt-3 text-center">
              No forms yet. Pull down to sync or ask your admin to assign forms.
            </Text>
          </View>
        ) : (
          recentForms.map((form) => (
            <FormCard
              key={form.id}
              form={form}
              onPress={() => router.push({ pathname: '/(app)/forms/[id]', params: { id: form.id } })}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}
