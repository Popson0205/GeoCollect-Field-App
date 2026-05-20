import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { User, OrgMembership, OrgRole } from '../types';
import { api } from '../services/api';

interface AuthState {
  user: User | null;
  memberships: OrgMembership[];
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  acceptInvite: (token: string) => Promise<void>;

  // Helpers
  getActiveOrgRole: (orgId: string) => OrgRole | null;
  canEditForms: (orgId?: string) => boolean;
  canManageOrg: (orgId: string) => boolean;
}

interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  account_type: 'individual' | 'organization';
  org_name?: string;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  memberships: [],
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const { user, tokens } = await api.login(email, password);
    await api.saveTokens(tokens);
    const { memberships } = await api.getMe();
    set({ user, memberships, isAuthenticated: true });
  },

  register: async (data) => {
    const { user, tokens } = await api.register(data);
    await api.saveTokens(tokens);
    set({ user, memberships: [], isAuthenticated: true });
  },

  logout: async () => {
    await api.logout();
    set({ user: null, memberships: [], isAuthenticated: false });
  },

  loadUser: async () => {
    set({ isLoading: true });
    try {
      const { user, memberships } = await api.getMe();
      set({ user, memberships, isAuthenticated: true });
    } catch {
      set({ isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  acceptInvite: async (token) => {
    await api.acceptInvite(token);
    // Refresh memberships
    const { memberships } = await api.getMe();
    set({ memberships });
  },

  getActiveOrgRole: (orgId) => {
    const membership = get().memberships.find((m) => m.org_id === orgId);
    return membership?.role ?? null;
  },

  canEditForms: (orgId?) => {
    if (!orgId) return true; // individual account
    const role = get().getActiveOrgRole(orgId);
    return role === 'admin' || role === 'form_editor';
  },

  canManageOrg: (orgId) => {
    return get().getActiveOrgRole(orgId) === 'admin';
  },
}));
