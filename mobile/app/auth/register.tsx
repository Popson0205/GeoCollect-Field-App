import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { Ionicons } from '@expo/vector-icons';

type AccountType = 'individual' | 'organization';

export default function RegisterScreen() {
  const [accountType, setAccountType] = useState<AccountType>('individual');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [orgName, setOrgName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }
    if (accountType === 'organization' && !orgName.trim()) {
      Alert.alert('Missing org name', 'Please enter your organization name.');
      return;
    }

    setLoading(true);
    try {
      await register({
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName.trim(),
        account_type: accountType,
        org_name: accountType === 'organization' ? orgName.trim() : undefined,
      });
      router.replace('/(app)/home');
    } catch (e: any) {
      Alert.alert('Registration failed', e?.response?.data?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 px-6 pt-16 pb-8">
          <TouchableOpacity onPress={() => router.back()} className="mb-6">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>

          <Text className="text-2xl font-bold text-gray-900 mb-2">Create account</Text>
          <Text className="text-gray-500 mb-8">Start collecting field data today.</Text>

          {/* Account Type Toggle */}
          <Text className="text-sm font-medium text-gray-700 mb-2">Account type</Text>
          <View className="flex-row border border-gray-300 rounded-xl overflow-hidden mb-5">
            {(['individual', 'organization'] as AccountType[]).map((type) => (
              <TouchableOpacity
                key={type}
                className={`flex-1 py-3 items-center ${accountType === type ? 'bg-primary-600' : 'bg-white'}`}
                onPress={() => setAccountType(type)}
              >
                <Text className={`font-medium capitalize ${accountType === type ? 'text-white' : 'text-gray-600'}`}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Full name</Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3.5 text-base bg-gray-50"
              placeholder="Jane Okafor"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          {accountType === 'organization' && (
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Organization name</Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3.5 text-base bg-gray-50"
                placeholder="GEE MAP Ltd"
                value={orgName}
                onChangeText={setOrgName}
              />
            </View>
          )}

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Email</Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3.5 text-base bg-gray-50"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Password</Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3.5 text-base bg-gray-50"
              placeholder="Min. 8 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-2">Confirm password</Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3.5 text-base bg-gray-50"
              placeholder="Repeat password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            className={`rounded-xl py-4 items-center ${loading ? 'bg-primary-400' : 'bg-primary-600'}`}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text className="text-white font-semibold text-base">
              {loading ? 'Creating account...' : 'Create account'}
            </Text>
          </TouchableOpacity>

          <View className="flex-row justify-center mt-6">
            <Text className="text-gray-500">Already have an account? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-primary-600 font-semibold">Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
