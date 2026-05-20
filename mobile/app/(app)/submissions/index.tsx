import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, Alert
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSubmissionStore } from '../../../src/store/submissionStore';
import { useFormStore } from '../../../src/store/formStore';
import { exportSubmissions } from '../../../src/services/export';
import { ExportFormat, Submission, SubmissionStatus } from '../../../src/types';

const STATUS_CONFIG: Record<SubmissionStatus, { color: string; icon: string; label: string }> = {
  draft: { color: 'bg-gray-100 text-gray-600', icon: 'document-outline', label: 'Draft' },
  pending: { color: 'bg-orange-100 text-orange-700', icon: 'cloud-upload-outline', label: 'Pending' },
  synced: { color: 'bg-green-100 text-green-700', icon: 'checkmark-circle-outline', label: 'Synced' },
  failed: { color: 'bg-red-100 text-red-700', icon: 'alert-circle-outline', label: 'Failed' },
};

const EXPORT_FORMATS: { format: ExportFormat; label: string; icon: string }[] = [
  { format: 'csv', label: 'CSV', icon: 'grid-outline' },
  { format: 'geojson', label: 'GeoJSON', icon: 'map-outline' },
  { format: 'kml', label: 'KML', icon: 'earth-outline' },
  { format: 'shapefile', label: 'Shapefile', icon: 'layers-outline' },
  { format: 'dxf', label: 'CAD/DXF', icon: 'construct-outline' },
  { format: 'json', label: 'JSON', icon: 'code-outline' },
];

export default function SubmissionsScreen() {
  const { submissions, loadSubmissions, syncPending, isSyncing, pendingCount } = useSubmissionStore();
  const { getFormById } = useFormStore();
  const [exportLoading, setExportLoading] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => { loadSubmissions(); }, []);

  const handleExport = async (format: ExportFormat) => {
    setShowExportMenu(false);
    if (submissions.length === 0) {
      Alert.alert('No data', 'No submissions to export.');
      return;
    }
    setExportLoading(true);
    try {
      // Group by form and export the first form's submissions
      const formId = submissions[0].form_id;
      const form = getFormById(formId);
      if (!form) throw new Error('Form not found');
      const formSubs = submissions.filter((s) => s.form_id === formId);
      await exportSubmissions(formSubs, form, format);
    } catch (e: any) {
      Alert.alert('Export failed', e.message ?? 'Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 pt-14 pb-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-2xl font-bold text-gray-900">Submissions</Text>
          <View className="flex-row gap-x-2">
            {pendingCount > 0 && (
              <TouchableOpacity
                className="flex-row items-center bg-orange-500 rounded-xl px-3 py-2"
                onPress={() => syncPending()}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="cloud-upload" size={16} color="white" />
                )}
                <Text className="text-white font-medium text-sm ml-1">{pendingCount}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              className="bg-primary-600 rounded-xl px-3 py-2 flex-row items-center"
              onPress={() => setShowExportMenu(true)}
              disabled={exportLoading}
            >
              {exportLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={16} color="white" />
                  <Text className="text-white font-medium text-sm ml-1">Export</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <Text className="text-gray-500 text-sm">{submissions.length} total submissions</Text>
      </View>

      {/* Export Format Menu */}
      {showExportMenu && (
        <View className="bg-white border-b border-gray-100 px-4 py-3">
          <Text className="text-sm font-medium text-gray-700 mb-2">Select export format:</Text>
          <View className="flex-row flex-wrap gap-2">
            {EXPORT_FORMATS.map(({ format, label, icon }) => (
              <TouchableOpacity
                key={format}
                className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2"
                onPress={() => handleExport(format)}
              >
                <Ionicons name={icon as any} size={14} color="#374151" />
                <Text className="text-gray-700 text-sm font-medium ml-1">{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity className="mt-2" onPress={() => setShowExportMenu(false)}>
            <Text className="text-gray-400 text-sm">Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Submissions List */}
      <FlatList
        data={submissions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        onRefresh={() => loadSubmissions()}
        refreshing={false}
        renderItem={({ item }) => {
          const form = getFormById(item.form_id);
          const config = STATUS_CONFIG[item.status];
          return (
            <TouchableOpacity
              className="bg-white rounded-2xl p-4 mb-3 border border-gray-100"
              onPress={() => router.push({ pathname: '/(app)/submissions/[id]', params: { id: item.id } })}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 mr-3">
                  <Text className="font-semibold text-gray-900 mb-1">
                    {form?.title ?? 'Unknown form'}
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    {new Date(item.submitted_at).toLocaleString()}
                  </Text>
                  {item.location && (
                    <Text className="text-gray-400 text-xs mt-0.5">
                      {item.location.latitude.toFixed(4)}, {item.location.longitude.toFixed(4)}
                    </Text>
                  )}
                </View>
                <View className={`flex-row items-center px-2.5 py-1 rounded-full ${config.color.split(' ')[0]}`}>
                  <Ionicons name={config.icon as any} size={12} color={config.color.includes('orange') ? '#c2410c' : config.color.includes('green') ? '#15803d' : config.color.includes('red') ? '#b91c1c' : '#4b5563'} />
                  <Text className={`text-xs font-medium ml-1 ${config.color.split(' ')[1]}`}>{config.label}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Ionicons name="cloud-upload-outline" size={48} color="#d1d5db" />
            <Text className="text-gray-400 mt-3">No submissions yet</Text>
          </View>
        }
      />
    </View>
  );
}
