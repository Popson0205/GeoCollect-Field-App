import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSubmissionStore } from '../../../src/store/submissionStore';
import { useFormStore } from '../../../src/store/formStore';
import { exportSubmissions } from '../../../src/services/export';

export default function SubmissionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getSubmissionById } = useSubmissionStore();
  const { getFormById } = useFormStore();
  const submission = getSubmissionById(id);
  const form = submission ? getFormById(submission.form_id) : undefined;

  if (!submission || !form) {
    return <View className="flex-1 items-center justify-center"><Text className="text-gray-500">Not found</Text></View>;
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-4 pt-14 pb-4 border-b border-gray-100 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 flex-1">Submission Detail</Text>
        <TouchableOpacity onPress={() => exportSubmissions([submission], form, 'geojson')}>
          <Ionicons name="download-outline" size={22} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
          <Text className="font-semibold text-gray-800 mb-3">{form.title}</Text>
          <Text className="text-gray-500 text-sm">{new Date(submission.submitted_at).toLocaleString()}</Text>
          {submission.location && (
            <Text className="text-gray-500 text-xs mt-1">
              {submission.location.latitude.toFixed(6)}, {submission.location.longitude.toFixed(6)}
            </Text>
          )}
        </View>

        <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
          <Text className="font-semibold text-gray-800 mb-3">Answers</Text>
          {form.fields.map((field) => {
            const val = submission.answers[field.id];
            return (
              <View key={field.id} className="py-2.5 border-b border-gray-50">
                <Text className="text-gray-500 text-xs mb-0.5">{field.label}</Text>
                <Text className="text-gray-900">
                  {Array.isArray(val) ? val.join(', ') : String(val ?? '—')}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
