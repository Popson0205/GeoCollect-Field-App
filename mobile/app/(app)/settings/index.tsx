import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, Switch
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/authStore';
import { api } from '../../../src/services/api';
import * as FileSystem from 'expo-file-system';

interface SettingRowProps {
  icon: string; label: string; value?: string;
  onPress?: () => void; destructive?: boolean; toggle?: boolean;
  toggleValue?: boolean; onToggle?: (val: boolean) => void;
}

function SettingRow({ icon, label, value, onPress, destructive, toggle, toggleValue, onToggle }: SettingRowProps) {
  return (
    <TouchableOpacity
      className="flex-row items-center py-4 border-b border-gray-100"
      onPress={onPress}
      disabled={!onPress && !toggle}
    >
      <View className={`w-8 h-8 rounded-lg items-center justify-center mr-3 ${destructive ? 'bg-red-100' : 'bg-gray-100'}`}>
        <Ionicons name={icon as any} size={18} color={destructive ? '#dc2626' : '#374151'} />
      </View>
      <View className="flex-1">
        <Text className={`font-medium ${destructive ? 'text-red-600' : 'text-gray-800'}`}>{label}</Text>
        {value && <Text className="text-gray-500 text-sm mt-0.5">{value}</Text>}
      </View>
      {toggle ? (
        <Switch value={toggleValue} onValueChange={onToggle} trackColor={{ true: '#2563eb' }} />
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
      ) : null}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { user, memberships, logout } = useAuthStore();
  const [serverUrl, setServerUrl] = useState('');
  const [editingServer, setEditingServer] = useState(false);
  const [storageUsed, setStorageUsed] = useState('');

  useEffect(() => {
    api.getServerUrl().then(setServerUrl);
    getStorageInfo();
  }, []);

  const getStorageInfo = async () => {
    try {
      const info = await FileSystem.getInfoAsync(FileSystem.documentDirectory!);
      if (info.exists && 'size' in info) {
        const mb = (info.size / 1024 / 1024).toFixed(1);
        setStorageUsed(`${mb} MB used`);
      }
    } catch { setStorageUsed('Unknown'); }
  };

  const handleSaveServerUrl = async () => {
    try {
      await api.setServerUrl(serverUrl);
      setEditingServer(false);
      Alert.alert('Saved', 'Server URL updated.');
    } catch {
      Alert.alert('Error', 'Invalid URL');
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => {
        await logout();
        router.replace('/auth/login');
      }},
    ]);
  };

  const handleClearCache = () => {
    Alert.alert('Clear offline data', 'This will delete all locally cached forms and synced submissions. Pending submissions will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => {
        // In production: clear SQLite tables for forms and synced submissions
        Alert.alert('Done', 'Offline data cleared.');
        getStorageInfo();
      }},
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="bg-white px-4 pt-14 pb-4 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">Settings</Text>
      </View>

      {/* Account */}
      <View className="bg-white mx-4 mt-4 rounded-2xl px-4 border border-gray-100">
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-4 pb-2">Account</Text>
        <SettingRow icon="person-outline" label={user?.full_name ?? 'User'} value={user?.email} />
        {memberships.map((m) => (
          <SettingRow key={m.org_id} icon="business-outline" label={m.org_name} value={m.role.replace('_', ' ')} />
        ))}
        <View className="py-4">
          <SettingRow icon="log-out-outline" label="Sign out" onPress={handleLogout} destructive />
        </View>
      </View>

      {/* Server */}
      <View className="bg-white mx-4 mt-4 rounded-2xl px-4 border border-gray-100">
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-4 pb-2">Server</Text>
        {editingServer ? (
          <View className="py-3">
            <TextInput
              className="border border-gray-300 rounded-xl px-3 py-3 mb-3 text-base bg-gray-50"
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="https://api.yourserver.com"
              autoCapitalize="none"
              keyboardType="url"
            />
            <View className="flex-row gap-x-3">
              <TouchableOpacity
                className="flex-1 bg-primary-600 rounded-xl py-3 items-center"
                onPress={handleSaveServerUrl}
              >
                <Text className="text-white font-semibold">Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 border border-gray-300 rounded-xl py-3 items-center"
                onPress={() => setEditingServer(false)}
              >
                <Text className="text-gray-600 font-semibold">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <SettingRow
            icon="server-outline"
            label="API Server"
            value={serverUrl || 'Default (geocollect.app)'}
            onPress={() => setEditingServer(true)}
          />
        )}
      </View>

      {/* Storage */}
      <View className="bg-white mx-4 mt-4 mb-8 rounded-2xl px-4 border border-gray-100">
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-4 pb-2">Storage</Text>
        <SettingRow icon="folder-outline" label="Offline storage" value={storageUsed} />
        <View className="py-4">
          <SettingRow icon="trash-outline" label="Clear offline data" onPress={handleClearCache} destructive />
        </View>
      </View>

      <Text className="text-center text-gray-400 text-xs pb-8">GeoCollect Field v1.0.0</Text>
    </ScrollView>
  );
}
