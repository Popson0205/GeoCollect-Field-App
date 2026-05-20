import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { Link, router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/(app)/home');
    } catch (e: any) {
      Alert.alert('Login failed', e?.response?.data?.message ?? 'Please check your credentials.');
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
        <View className="flex-1 px-6 pt-20 pb-8">
          {/* Logo */}
          <View className="items-center mb-10">
            <View className="w-16 h-16 rounded-2xl bg-primary-600 items-center justify-center mb-4">
              <Ionicons name="map" size={32} color="white" />
            </View>
            <Text className="text-3xl font-bold text-gray-900">GeoCollect</Text>
            <Text className="text-gray-500 mt-1">Field Data Collection</Text>
          </View>

          {/* Form */}
          <Text className="text-2xl font-bold text-gray-900 mb-2">Sign in</Text>
          <Text className="text-gray-500 mb-8">Welcome back. Enter your credentials to continue.</Text>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Email</Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-gray-50"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-2">Password</Text>
            <View className="relative">
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-gray-50 pr-12"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <TouchableOpacity
                className="absolute right-4 top-3.5"
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            className={`rounded-xl py-4 items-center ${loading ? 'bg-primary-400' : 'bg-primary-600'}`}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text className="text-white font-semibold text-base">
              {loading ? 'Signing in...' : 'Sign in'}
            </Text>
          </TouchableOpacity>

          <View className="flex-row justify-center mt-6">
            <Text className="text-gray-500">Don't have an account? </Text>
            <Link href="/auth/register" asChild>
              <TouchableOpacity>
                <Text className="text-primary-600 font-semibold">Register</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
