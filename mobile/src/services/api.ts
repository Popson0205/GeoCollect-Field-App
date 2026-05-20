import axios, { AxiosError, AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { AuthTokens, Form, Submission, OrgMember, OrgInvitation, OrgMembership, User } from '../types';

const SECURE_KEYS = {
  ACCESS_TOKEN: 'gc_access_token',
  REFRESH_TOKEN: 'gc_refresh_token',
  SERVER_URL: 'gc_server_url',
} as const;

const DEFAULT_SERVER_URL = 'https://api.geocollect.app';

class GeoCollectAPI {
  private client: AxiosInstance;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.client = axios.create({
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });

    // Request interceptor — attach token + base URL
    this.client.interceptors.request.use(async (config) => {
      const [serverUrl, accessToken] = await Promise.all([
        SecureStore.getItemAsync(SECURE_KEYS.SERVER_URL),
        SecureStore.getItemAsync(SECURE_KEYS.ACCESS_TOKEN),
      ]);
      config.baseURL = serverUrl || DEFAULT_SERVER_URL;
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      return config;
    });

    // Response interceptor — auto-refresh on 401
    this.client.interceptors.response.use(
      (res) => res,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const newToken = await this.refreshAccessToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          } catch {
            await this.clearTokens();
            throw error;
          }
        }
        throw error;
      }
    );
  }

  // ─── Token Management ────────────────────────────────────────────
  async saveTokens(tokens: AuthTokens) {
    await Promise.all([
      SecureStore.setItemAsync(SECURE_KEYS.ACCESS_TOKEN, tokens.access_token),
      SecureStore.setItemAsync(SECURE_KEYS.REFRESH_TOKEN, tokens.refresh_token),
    ]);
  }

  async clearTokens() {
    await Promise.all([
      SecureStore.deleteItemAsync(SECURE_KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(SECURE_KEYS.REFRESH_TOKEN),
    ]);
  }

  async setServerUrl(url: string) {
    await SecureStore.setItemAsync(SECURE_KEYS.SERVER_URL, url.replace(/\/$/, ''));
  }

  async getServerUrl(): Promise<string> {
    return (await SecureStore.getItemAsync(SECURE_KEYS.SERVER_URL)) || DEFAULT_SERVER_URL;
  }

  private async refreshAccessToken(): Promise<string> {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = (async () => {
      const refreshToken = await SecureStore.getItemAsync(SECURE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) throw new Error('No refresh token');
      const serverUrl = await this.getServerUrl();
      const res = await axios.post(`${serverUrl}/auth/refresh`, { refresh_token: refreshToken });
      const { access_token, refresh_token } = res.data;
      await this.saveTokens({ access_token, refresh_token, expires_in: 900 });
      return access_token;
    })().finally(() => { this.refreshPromise = null; });
    return this.refreshPromise;
  }

  // ─── Auth ────────────────────────────────────────────────────────
  async register(data: {
    email: string; password: string; full_name: string;
    account_type: 'individual' | 'organization'; org_name?: string;
  }): Promise<{ user: User; tokens: AuthTokens }> {
    const res = await this.client.post('/auth/register', data);
    return res.data;
  }

  async login(email: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    const res = await this.client.post('/auth/login', { email, password });
    return res.data;
  }

  async logout() {
    try {
      const refreshToken = await SecureStore.getItemAsync(SECURE_KEYS.REFRESH_TOKEN);
      await this.client.post('/auth/logout', { refresh_token: refreshToken });
    } finally {
      await this.clearTokens();
    }
  }

  async getMe(): Promise<{ user: User; memberships: OrgMembership[] }> {
    const res = await this.client.get('/auth/me');
    return res.data;
  }

  async acceptInvite(token: string): Promise<void> {
    await this.client.post('/auth/accept-invite', { token });
  }

  // ─── Forms ───────────────────────────────────────────────────────
  async getAssignedForms(): Promise<Form[]> {
    const res = await this.client.get('/forms/assigned');
    return res.data;
  }

  async getForm(formId: string): Promise<Form> {
    const res = await this.client.get(`/forms/${formId}`);
    return res.data;
  }

  // ─── Submissions ─────────────────────────────────────────────────
  async uploadSubmission(submission: Submission): Promise<{ id: string; synced_at: string }> {
    const res = await this.client.post('/submissions', submission);
    return res.data;
  }

  async uploadSubmissionBatch(submissions: Submission[]): Promise<{
    results: Array<{ id: string; success: boolean; synced_at?: string; error?: string }>;
  }> {
    const res = await this.client.post('/submissions/batch', { submissions });
    return res.data;
  }

  async getSubmissions(formId: string, page = 1): Promise<{
    data: Submission[]; total: number; page: number; per_page: number;
  }> {
    const res = await this.client.get('/submissions', { params: { form_id: formId, page } });
    return res.data;
  }

  // ─── Attachments ─────────────────────────────────────────────────
  async uploadAttachment(
    submissionId: string, fieldId: string, fileUri: string, mimeType: string
  ): Promise<{ id: string; url: string }> {
    const formData = new FormData();
    formData.append('submission_id', submissionId);
    formData.append('field_id', fieldId);
    formData.append('file', { uri: fileUri, type: mimeType, name: fileUri.split('/').pop() } as any);
    const res = await this.client.post('/attachments/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  }

  // ─── Organization ─────────────────────────────────────────────────
  async getOrgMembers(orgId: string): Promise<OrgMember[]> {
    const res = await this.client.get(`/orgs/${orgId}/members`);
    return res.data;
  }

  async inviteMember(orgId: string, email: string, role: string): Promise<void> {
    await this.client.post(`/orgs/${orgId}/invite`, { email, role });
  }

  async removeMember(orgId: string, userId: string): Promise<void> {
    await this.client.delete(`/orgs/${orgId}/members/${userId}`);
  }

  async changeMemberRole(orgId: string, userId: string, role: string): Promise<void> {
    await this.client.patch(`/orgs/${orgId}/members/${userId}`, { role });
  }

  async getPendingInvitations(orgId: string): Promise<OrgInvitation[]> {
    const res = await this.client.get(`/orgs/${orgId}/invitations`);
    return res.data;
  }

  // ─── Export (via geo-api) ─────────────────────────────────────────
  async exportToShapefile(geojson: object): Promise<ArrayBuffer> {
    const res = await this.client.post('/export/shapefile', { geojson }, { responseType: 'arraybuffer' });
    return res.data;
  }

  async exportToDXF(geojson: object): Promise<string> {
    const res = await this.client.post('/export/dxf', { geojson });
    return res.data.dxf;
  }
}

export const api = new GeoCollectAPI();
