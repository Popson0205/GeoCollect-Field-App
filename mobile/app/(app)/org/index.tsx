import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/authStore';
import { api } from '../../../src/services/api';
import { OrgMember, OrgInvitation, OrgRole } from '../../../src/types';

const ROLE_LABELS: Record<OrgRole, { label: string; color: string; description: string }> = {
  admin: { label: 'Admin', color: 'bg-purple-100 text-purple-700', description: 'Full access' },
  form_editor: { label: 'Form Editor', color: 'bg-blue-100 text-blue-700', description: 'Create & edit forms' },
  data_collector: { label: 'Collector', color: 'bg-green-100 text-green-700', description: 'Collect data only' },
  viewer: { label: 'Viewer', color: 'bg-gray-100 text-gray-600', description: 'View only' },
};

function InviteModal({ orgId, onClose, onSuccess }: { orgId: string; onClose: () => void; onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgRole>('data_collector');
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!email.trim()) { Alert.alert('Missing email'); return; }
    setLoading(true);
    try {
      await api.inviteMember(orgId, email.trim(), role);
      Alert.alert('Invite sent', `Invitation sent to ${email}`);
      onSuccess();
      onClose();
    } catch (e: any) {
      Alert.alert('Failed', e?.response?.data?.message ?? 'Could not send invite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal transparent animationType="slide">
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl p-6">
          <Text className="text-xl font-bold text-gray-900 mb-4">Invite Member</Text>
          <Text className="text-sm font-medium text-gray-700 mb-2">Email</Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 mb-4 bg-gray-50"
            placeholder="colleague@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text className="text-sm font-medium text-gray-700 mb-2">Role</Text>
          <View className="gap-y-2 mb-6">
            {(Object.keys(ROLE_LABELS) as OrgRole[]).filter((r) => r !== 'admin').map((r) => (
              <TouchableOpacity
                key={r}
                className={`flex-row items-center p-3 rounded-xl border ${role === r ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}
                onPress={() => setRole(r)}
              >
                <View className={`w-4 h-4 rounded-full border-2 mr-3 ${role === r ? 'border-primary-500 bg-primary-500' : 'border-gray-300'}`} />
                <View>
                  <Text className="font-medium text-gray-800">{ROLE_LABELS[r].label}</Text>
                  <Text className="text-gray-500 text-xs">{ROLE_LABELS[r].description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            className="bg-primary-600 rounded-xl py-4 items-center mb-3"
            onPress={handleInvite}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold">Send Invite</Text>}
          </TouchableOpacity>
          <TouchableOpacity className="py-3 items-center" onPress={onClose}>
            <Text className="text-gray-500 font-medium">Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function OrgScreen() {
  const { user, memberships, canManageOrg } = useAuthStore();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invitations, setInvitations] = useState<OrgInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const activeOrg = memberships[0]; // Primary org

  const isAdmin = activeOrg ? canManageOrg(activeOrg.org_id) : false;

  const loadMembers = async () => {
    if (!activeOrg) return;
    setLoading(true);
    try {
      const [m, inv] = await Promise.all([
        api.getOrgMembers(activeOrg.org_id),
        isAdmin ? api.getPendingInvitations(activeOrg.org_id) : Promise.resolve([]),
      ]);
      setMembers(m);
      setInvitations(inv);
    } catch (e) {
      console.error('Failed to load members', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMembers(); }, [activeOrg?.org_id]);

  if (!activeOrg) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center px-6">
        <Ionicons name="people-outline" size={48} color="#d1d5db" />
        <Text className="text-gray-500 text-center mt-4">
          You're not part of any organization. Register an organization account or accept an invite.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-4 pt-14 pb-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-gray-900">{activeOrg.org_name}</Text>
            <View className={`self-start mt-1 px-2 py-0.5 rounded-full ${ROLE_LABELS[activeOrg.role].color}`}>
              <Text className={`text-xs font-medium ${ROLE_LABELS[activeOrg.role].color.split(' ')[1]}`}>
                {ROLE_LABELS[activeOrg.role].label}
              </Text>
            </View>
          </View>
          {isAdmin && (
            <TouchableOpacity
              className="bg-primary-600 rounded-xl px-4 py-2 flex-row items-center"
              onPress={() => setShowInviteModal(true)}
            >
              <Ionicons name="person-add-outline" size={16} color="white" />
              <Text className="text-white font-medium text-sm ml-1">Invite</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={members}
        keyExtractor={(item) => item.user_id}
        contentContainerStyle={{ padding: 16 }}
        onRefresh={loadMembers}
        refreshing={loading}
        ListHeaderComponent={
          invitations.length > 0 ? (
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">Pending Invitations ({invitations.length})</Text>
              {invitations.map((inv) => (
                <View key={inv.id} className="bg-orange-50 rounded-xl p-3 mb-2 border border-orange-200">
                  <Text className="text-gray-800 font-medium">{inv.email}</Text>
                  <Text className="text-orange-600 text-xs mt-0.5">{ROLE_LABELS[inv.role].label} · Expires {new Date(inv.expires_at).toLocaleDateString()}</Text>
                </View>
              ))}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center mr-3">
              <Text className="text-primary-700 font-bold text-base">
                {item.full_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-gray-900">{item.full_name}</Text>
              <Text className="text-gray-500 text-sm">{item.email}</Text>
            </View>
            <View className={`px-2.5 py-1 rounded-full ${ROLE_LABELS[item.role].color.split(' ')[0]}`}>
              <Text className={`text-xs font-medium ${ROLE_LABELS[item.role].color.split(' ')[1]}`}>
                {ROLE_LABELS[item.role].label}
              </Text>
            </View>
          </View>
        )}
      />

      {showInviteModal && activeOrg && (
        <InviteModal
          orgId={activeOrg.org_id}
          onClose={() => setShowInviteModal(false)}
          onSuccess={loadMembers}
        />
      )}
    </View>
  );
}
