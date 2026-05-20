import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFormStore } from '../../../src/store/formStore';

export default function FormDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getFormById } = useFormStore();
  const form = getFormById(id);

  if (!form) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-500">Form not found</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-4 pt-14 pb-4 border-b border-gray-100 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 flex-1" numberOfLines={1}>{form.title}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {form.description && (
          <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
            <Text className="text-gray-700">{form.description}</Text>
          </View>
        )}

        <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
          <Text className="font-semibold text-gray-800 mb-3">Form Info</Text>
          <View className="flex-row justify-between py-2 border-b border-gray-50">
            <Text className="text-gray-500">Fields</Text>
            <Text className="text-gray-900 font-medium">{form.fields.length}</Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-gray-50">
            <Text className="text-gray-500">Version</Text>
            <Text className="text-gray-900 font-medium">v{form.version}</Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-gray-50">
            <Text className="text-gray-500">GPS required</Text>
            <Text className="text-gray-900 font-medium">{form.settings.require_gps ? 'Yes' : 'No'}</Text>
          </View>
          <View className="flex-row justify-between py-2">
            <Text className="text-gray-500">Geofence</Text>
            <Text className="text-gray-900 font-medium">{form.geofence ? form.geofence.name : 'None'}</Text>
          </View>
        </View>

        <View className="bg-white rounded-2xl p-4 mb-6 border border-gray-100">
          <Text className="font-semibold text-gray-800 mb-3">Fields ({form.fields.length})</Text>
          {form.fields.map((field, i) => (
            <View key={field.id} className={`flex-row items-center py-2.5 ${i < form.fields.length - 1 ? 'border-b border-gray-50' : ''}`}>
              <Text className="text-gray-400 text-sm w-6">{i + 1}.</Text>
              <View className="flex-1">
                <Text className="text-gray-800 font-medium">{field.label}</Text>
                <Text className="text-gray-400 text-xs capitalize">{field.type.replace('_', ' ')}</Text>
              </View>
              {field.required && (
                <View className="bg-red-100 rounded-full px-2 py-0.5">
                  <Text className="text-red-600 text-xs">Required</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        <TouchableOpacity
          className="bg-primary-600 rounded-2xl py-4 items-center"
          onPress={() => router.push({ pathname: '/(app)/forms/collect', params: { id: form.id } })}
        >
          <View className="flex-row items-center">
            <Ionicons name="add-circle-outline" size={20} color="white" />
            <Text className="text-white font-bold text-lg ml-2">Start Collecting</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
