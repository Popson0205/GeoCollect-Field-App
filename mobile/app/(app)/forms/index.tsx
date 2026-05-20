import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFormStore } from '../../../src/store/formStore';
import { Form } from '../../../src/types';

export default function FormsListScreen() {
  const { forms, syncForms, isLoading } = useFormStore();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const filtered = forms.filter((f) =>
    f.title.toLowerCase().includes(search.toLowerCase())
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try { await syncForms(); } finally { setRefreshing(false); }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-4 pt-14 pb-4 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900 mb-3">Forms</Text>
        <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2.5">
          <Ionicons name="search" size={18} color="#6b7280" />
          <TextInput
            className="flex-1 ml-2 text-base text-gray-900"
            placeholder="Search forms..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="bg-white rounded-2xl p-4 mb-3 border border-gray-100"
            onPress={() => router.push({ pathname: '/(app)/forms/[id]', params: { id: item.id } })}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-3">
                <Text className="font-semibold text-gray-900 mb-1">{item.title}</Text>
                <View className="flex-row items-center gap-x-3">
                  <Text className="text-gray-500 text-xs">{item.fields.length} fields</Text>
                  {item.geofence && (
                    <View className="flex-row items-center">
                      <Ionicons name="location" size={12} color="#2563eb" />
                      <Text className="text-primary-600 text-xs ml-0.5">Geofenced</Text>
                    </View>
                  )}
                  {item.org_id && (
                    <View className="flex-row items-center">
                      <Ionicons name="people" size={12} color="#6b7280" />
                      <Text className="text-gray-500 text-xs ml-0.5">Org</Text>
                    </View>
                  )}
                </View>
              </View>
              <TouchableOpacity
                className="bg-primary-600 rounded-xl px-4 py-2"
                onPress={() => router.push({ pathname: '/(app)/forms/collect', params: { id: item.id } })}
              >
                <Text className="text-white font-semibold text-sm">Collect</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Ionicons name="document-text-outline" size={48} color="#d1d5db" />
            <Text className="text-gray-400 mt-3">No forms found</Text>
          </View>
        }
      />
    </View>
  );
}
