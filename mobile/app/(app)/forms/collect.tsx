import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  ActivityIndicator, Modal, Platform
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFormStore } from '../../../src/store/formStore';
import { useAuthStore } from '../../../src/store/authStore';
import { useSubmissionStore } from '../../../src/store/submissionStore';
import { getCurrentLocation, checkPointInGeofence, startGPSTrack } from '../../../src/services/geofence';
import { Form, FormField, GPSPoint, AnswerValue, Geofence } from '../../../src/types';
import { FieldRenderer } from '../../../src/components/forms/FieldRenderer';
import * as crypto from 'expo-crypto';

type FormState = Record<string, AnswerValue>;

function GeofenceWarning({ geofence, distance, onProceed, onCancel }: {
  geofence: Geofence; distance: number;
  onProceed: () => void; onCancel: () => void;
}) {
  return (
    <Modal transparent animationType="fade">
      <View className="flex-1 bg-black/50 items-center justify-center px-6">
        <View className="bg-white rounded-2xl p-6 w-full">
          <View className="items-center mb-4">
            <View className="w-14 h-14 rounded-full bg-orange-100 items-center justify-center">
              <Ionicons name="warning" size={28} color="#ea580c" />
            </View>
          </View>
          <Text className="text-xl font-bold text-gray-900 text-center mb-2">Outside Survey Zone</Text>
          <Text className="text-gray-600 text-center mb-2">
            You are approximately <Text className="font-semibold">{distance} m</Text> outside the
            designated area for "{geofence.name}".
          </Text>
          <Text className="text-gray-500 text-sm text-center mb-6">
            {geofence.enforcement === 'warn'
              ? 'You can proceed, but this will be recorded.'
              : 'You must be inside the survey zone to submit.'}
          </Text>
          {geofence.enforcement === 'warn' ? (
            <View className="gap-y-3">
              <TouchableOpacity
                className="bg-orange-500 rounded-xl py-3.5 items-center"
                onPress={onProceed}
              >
                <Text className="text-white font-semibold">Proceed Anyway</Text>
              </TouchableOpacity>
              <TouchableOpacity className="py-3.5 items-center" onPress={onCancel}>
                <Text className="text-gray-600 font-medium">Go Back</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              className="bg-primary-600 rounded-xl py-3.5 items-center"
              onPress={onCancel}
            >
              <Text className="text-white font-semibold">Go Back</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function CollectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getFormById, markFormUsed } = useFormStore();
  const { user } = useAuthStore();
  const { saveSubmission } = useSubmissionStore();

  const form = getFormById(id);
  const [answers, setAnswers] = useState<FormState>({});
  const [currentLocation, setCurrentLocation] = useState<GPSPoint | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [geofenceWarning, setGeofenceWarning] = useState<{ distance: number } | null>(null);
  const [geofenceStatus, setGeofenceStatus] = useState<'inside' | 'outside' | 'bypassed' | 'not_applicable'>('not_applicable');
  const trackStopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!form) return;
    markFormUsed(form.id);
    initLocation();
    return () => { trackStopRef.current?.(); };
  }, [form?.id]);

  const initLocation = async () => {
    setLocationLoading(true);
    const loc = await getCurrentLocation();
    setCurrentLocation(loc);
    setLocationLoading(false);

    if (loc && form?.geofence) {
      const result = checkPointInGeofence(loc, form.geofence);
      if (result.status === 'outside') {
        setGeofenceStatus('outside');
        if (form.geofence.enforcement === 'block') {
          setGeofenceWarning({ distance: result.distance_m });
        } else if (form.geofence.enforcement === 'warn') {
          setGeofenceWarning({ distance: result.distance_m });
        }
      } else {
        setGeofenceStatus('inside');
      }
    }
  };

  const handleFieldChange = useCallback((fieldId: string, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const validateForm = (): string | null => {
    if (!form) return 'Form not found';
    for (const field of form.fields) {
      if (field.required) {
        const val = answers[field.id];
        if (val === undefined || val === null || val === '') {
          return `"${field.label}" is required`;
        }
        if (Array.isArray(val) && val.length === 0) {
          return `"${field.label}" is required`;
        }
      }
    }
    if (form.settings.require_gps && !currentLocation) {
      return 'GPS location is required for this form. Please wait for a GPS fix.';
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!form || !user) return;

    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Cannot submit', validationError);
      return;
    }

    // Check geofence one more time on submit
    if (currentLocation && form.geofence && form.geofence.active) {
      const result = checkPointInGeofence(currentLocation, form.geofence);
      if (result.status === 'outside') {
        if (form.geofence.enforcement === 'block') {
          Alert.alert('Outside survey zone', 'You must be inside the designated area to submit.');
          return;
        }
        if (form.geofence.enforcement === 'warn' && geofenceStatus !== 'bypassed') {
          setGeofenceWarning({ distance: result.distance_m });
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const submissionId = await crypto.randomUUID();
      await saveSubmission({
        id: submissionId,
        form_id: form.id,
        form_version: form.version,
        submitted_by: user.id,
        org_id: form.org_id,
        submitted_at: new Date().toISOString(),
        status: 'pending',
        location: currentLocation ?? undefined,
        geofence_status: geofenceStatus,
        answers,
        attachment_ids: [],
      });

      Alert.alert('Submitted!', 'Your data has been saved and will sync when connected.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to save submission. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!form) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-500">Form not found</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 pt-14 pb-4 border-b border-gray-100">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="font-bold text-gray-900 text-lg" numberOfLines={1}>{form.title}</Text>
            <View className="flex-row items-center mt-0.5">
              {locationLoading ? (
                <><ActivityIndicator size="small" color="#6b7280" /><Text className="text-gray-500 text-xs ml-1">Getting GPS...</Text></>
              ) : currentLocation ? (
                <><Ionicons name="location" size={12} color="#16a34a" />
                <Text className="text-green-600 text-xs ml-1">
                  GPS ±{Math.round(currentLocation.accuracy ?? 0)}m
                </Text></>
              ) : (
                <><Ionicons name="location-outline" size={12} color="#dc2626" />
                <Text className="text-red-600 text-xs ml-1">No GPS</Text></>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Geofence warning modal */}
      {geofenceWarning && form.geofence && (
        <GeofenceWarning
          geofence={form.geofence}
          distance={geofenceWarning.distance}
          onProceed={() => {
            setGeofenceStatus('bypassed');
            setGeofenceWarning(null);
          }}
          onCancel={() => {
            setGeofenceWarning(null);
            if (form.geofence?.enforcement === 'block') router.back();
          }}
        />
      )}

      {/* Form Fields */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {form.fields.map((field) => (
          <FieldRenderer
            key={field.id}
            field={field}
            value={answers[field.id]}
            onChange={(val) => handleFieldChange(field.id, val)}
            currentLocation={currentLocation}
          />
        ))}

        {/* Submit */}
        <TouchableOpacity
          className={`rounded-2xl py-4 items-center mt-4 ${submitting ? 'bg-primary-400' : 'bg-primary-600'}`}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <View className="flex-row items-center">
              <Ionicons name="cloud-upload-outline" size={20} color="white" />
              <Text className="text-white font-semibold text-base ml-2">Submit</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
