import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Switch, Image, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { FormField, AnswerValue, GPSPoint } from '../../types';
import { getCurrentLocation } from '../../services/geofence';

interface FieldRendererProps {
  field: FormField;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  currentLocation: GPSPoint | null;
}

function FieldWrapper({ field, children }: { field: FormField; children: React.ReactNode }) {
  return (
    <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
      <View className="flex-row items-center mb-2">
        <Text className="font-medium text-gray-800 flex-1">{field.label}</Text>
        {field.required && <Text className="text-red-500 text-sm ml-1">*</Text>}
      </View>
      {field.hint && <Text className="text-gray-500 text-xs mb-3">{field.hint}</Text>}
      {children}
    </View>
  );
}

export function FieldRenderer({ field, value, onChange, currentLocation }: FieldRendererProps) {
  const [gpsLoading, setGpsLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  switch (field.type) {
    case 'text':
      return (
        <FieldWrapper field={field}>
          <TextInput
            className="border border-gray-200 rounded-xl px-3 py-3 text-base text-gray-900 bg-gray-50"
            placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}...`}
            value={(value as string) ?? ''}
            onChangeText={onChange}
            multiline={field.hint?.includes('multiline') ?? false}
            numberOfLines={field.hint?.includes('multiline') ? 4 : 1}
          />
        </FieldWrapper>
      );

    case 'number':
      return (
        <FieldWrapper field={field}>
          <TextInput
            className="border border-gray-200 rounded-xl px-3 py-3 text-base text-gray-900 bg-gray-50"
            placeholder={`Enter number${field.min != null ? ` (${field.min}–${field.max})` : ''}`}
            value={value != null ? String(value) : ''}
            onChangeText={(t) => onChange(t === '' ? null : Number(t))}
            keyboardType="numeric"
          />
        </FieldWrapper>
      );

    case 'boolean':
      return (
        <FieldWrapper field={field}>
          <View className="flex-row items-center justify-between">
            <Text className="text-gray-700">{value ? 'Yes' : 'No'}</Text>
            <Switch
              value={Boolean(value)}
              onValueChange={onChange}
              trackColor={{ true: '#2563eb', false: '#d1d5db' }}
            />
          </View>
        </FieldWrapper>
      );

    case 'select':
      return (
        <FieldWrapper field={field}>
          <View className="gap-y-2">
            {(field.options ?? []).map((opt) => (
              <TouchableOpacity
                key={opt}
                className={`flex-row items-center p-3 rounded-xl border ${
                  value === opt ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-gray-50'
                }`}
                onPress={() => onChange(opt)}
              >
                <View className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                  value === opt ? 'border-primary-500 bg-primary-500' : 'border-gray-300'
                }`}>
                  {value === opt && <View className="w-2 h-2 rounded-full bg-white" />}
                </View>
                <Text className={value === opt ? 'text-primary-700 font-medium' : 'text-gray-700'}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </FieldWrapper>
      );

    case 'multi_select':
      const selected = (value as string[]) ?? [];
      return (
        <FieldWrapper field={field}>
          <View className="gap-y-2">
            {(field.options ?? []).map((opt) => {
              const isSelected = selected.includes(opt);
              return (
                <TouchableOpacity
                  key={opt}
                  className={`flex-row items-center p-3 rounded-xl border ${
                    isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-gray-50'
                  }`}
                  onPress={() => {
                    onChange(isSelected ? selected.filter((s) => s !== opt) : [...selected, opt]);
                  }}
                >
                  <View className={`w-5 h-5 rounded border-2 mr-3 items-center justify-center ${
                    isSelected ? 'border-primary-500 bg-primary-500' : 'border-gray-300'
                  }`}>
                    {isSelected && <Ionicons name="checkmark" size={12} color="white" />}
                  </View>
                  <Text className={isSelected ? 'text-primary-700 font-medium' : 'text-gray-700'}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </FieldWrapper>
      );

    case 'date':
    case 'datetime':
      return (
        <FieldWrapper field={field}>
          <TouchableOpacity
            className="border border-gray-200 rounded-xl px-3 py-3 bg-gray-50 flex-row items-center"
            onPress={() => onChange(new Date().toISOString())}
          >
            <Ionicons name="calendar-outline" size={18} color="#6b7280" />
            <Text className={`ml-2 text-base ${value ? 'text-gray-900' : 'text-gray-400'}`}>
              {value ? new Date(value as string).toLocaleString() : `Select ${field.type}`}
            </Text>
          </TouchableOpacity>
        </FieldWrapper>
      );

    case 'gps_point':
      const gps = value as GPSPoint | null;
      return (
        <FieldWrapper field={field}>
          {gps ? (
            <View className="bg-green-50 rounded-xl p-3 border border-green-200">
              <View className="flex-row items-center mb-1">
                <Ionicons name="location" size={16} color="#16a34a" />
                <Text className="text-green-700 font-medium ml-1">Location captured</Text>
              </View>
              <Text className="text-green-600 text-sm">
                {gps.latitude.toFixed(6)}, {gps.longitude.toFixed(6)}
              </Text>
              {gps.accuracy && (
                <Text className="text-green-500 text-xs mt-0.5">Accuracy: ±{Math.round(gps.accuracy)}m</Text>
              )}
              <TouchableOpacity
                className="mt-2 flex-row items-center"
                onPress={async () => {
                  setGpsLoading(true);
                  const loc = await getCurrentLocation();
                  if (loc) onChange(loc);
                  setGpsLoading(false);
                }}
              >
                <Ionicons name="refresh" size={14} color="#6b7280" />
                <Text className="text-gray-500 text-xs ml-1">Recapture</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              className="border-2 border-dashed border-gray-300 rounded-xl p-4 items-center"
              onPress={async () => {
                setGpsLoading(true);
                const loc = await getCurrentLocation();
                if (loc) onChange(loc);
                else Alert.alert('GPS Error', 'Could not get location. Please check permissions.');
                setGpsLoading(false);
              }}
              disabled={gpsLoading}
            >
              {gpsLoading ? (
                <ActivityIndicator color="#2563eb" />
              ) : (
                <>
                  <Ionicons name="locate" size={24} color="#2563eb" />
                  <Text className="text-primary-600 font-medium mt-2">Capture GPS Location</Text>
                  {currentLocation && (
                    <Text className="text-gray-400 text-xs mt-1">
                      Current: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                    </Text>
                  )}
                </>
              )}
            </TouchableOpacity>
          )}
        </FieldWrapper>
      );

    case 'photo':
      const photos = (value as string[]) ?? [];
      const maxPhotos = field.max_photos ?? 5;
      return (
        <FieldWrapper field={field}>
          <View className="flex-row flex-wrap gap-2">
            {photos.map((uri, i) => (
              <View key={i} className="relative">
                <Image source={{ uri }} className="w-20 h-20 rounded-xl" />
                <TouchableOpacity
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full items-center justify-center"
                  onPress={() => onChange(photos.filter((_, j) => j !== i))}
                >
                  <Ionicons name="close" size={12} color="white" />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < maxPhotos && (
              <TouchableOpacity
                className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-xl items-center justify-center"
                onPress={async () => {
                  const result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    quality: 0.8,
                    exif: true,
                  });
                  if (!result.canceled && result.assets[0]) {
                    onChange([...photos, result.assets[0].uri]);
                  }
                }}
              >
                <Ionicons name="camera" size={24} color="#6b7280" />
                <Text className="text-gray-400 text-xs mt-1">Photo</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text className="text-gray-400 text-xs mt-2">{photos.length}/{maxPhotos} photos</Text>
        </FieldWrapper>
      );

    case 'rating':
      const rating = (value as number) ?? 0;
      return (
        <FieldWrapper field={field}>
          <View className="flex-row gap-x-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => onChange(star)}>
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={32}
                  color={star <= rating ? '#f59e0b' : '#d1d5db'}
                />
              </TouchableOpacity>
            ))}
          </View>
        </FieldWrapper>
      );

    case 'barcode':
      return (
        <FieldWrapper field={field}>
          {value ? (
            <View className="flex-row items-center bg-green-50 rounded-xl p-3 border border-green-200">
              <Ionicons name="barcode" size={20} color="#16a34a" />
              <Text className="text-green-700 ml-2 flex-1">{String(value)}</Text>
              <TouchableOpacity onPress={() => onChange(null)}>
                <Ionicons name="close-circle" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              className="border-2 border-dashed border-gray-300 rounded-xl p-4 items-center"
              onPress={() => setScanning(true)}
            >
              <Ionicons name="barcode-outline" size={28} color="#2563eb" />
              <Text className="text-primary-600 font-medium mt-2">Scan Barcode / QR</Text>
            </TouchableOpacity>
          )}
        </FieldWrapper>
      );

    default:
      return (
        <FieldWrapper field={field}>
          <Text className="text-gray-400 text-sm">Field type "{field.type}" not yet supported</Text>
        </FieldWrapper>
      );
  }
}
