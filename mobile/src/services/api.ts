/**
 * API Client for Yomibiyori Backend
 * Connects to Railway-hosted FastAPI backend
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  SignUpRequest,
  SignUpResponse,
  LoginRequest,
  LoginResponse,
  UserProfile,
  SessionToken,
  Theme,
  ThemeListResponse,
  ThemeCategory,
  CreateWorkRequest,
  Work,
  WorkListResponse,
  WorkLikeResponse,
  WorkDateSummary,
  CreateResonanceRequest,
  Resonance,
  RankingResponse,
  ApiError,
} from '../types';

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = 'https://yomibiyori-production.up.railway.app/api/v1';

// ============================================================================
// Axios Instance
// ============================================================================

class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private tokenValidationHook: (() => Promise<void>) | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token and validate it
    this.client.interceptors.request.use(
      async (config) => {
        // Run token validation hook before request (proactive refresh)
        if (this.tokenValidationHook) {
          try {
            await this.tokenValidationHook();
          } catch (err) {
            console.error('[API] Token validation hook failed:', err);
          }
        }

        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiError>) => {
        if (error.response) {
          // Server responded with error status
          const apiError: ApiError = {
            detail: error.response.data?.detail || 'Unknown error occurred',
            status: error.response.status,
          };

          // Handle token expiration (401 with specific message)
          if (
            error.response.status === 401 &&
            error.response.data?.detail?.includes('expired')
          ) {
            // Token has expired - need to logout
            // Note: This will be handled by the caller (UI components)
            console.warn('[API] Token expired - user needs to re-login');
          }

          return Promise.reject(apiError);
        } else if (error.request) {
          // Request made but no response
          return Promise.reject({
            detail: 'Network error - please check your connection',
            status: 0,
          });
        } else {
          // Something else happened
          return Promise.reject({
            detail: error.message || 'Request failed',
            status: -1,
          });
        }
      }
    );
  }

  /**
   * Set access token for authenticated requests
   */
  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Set token validation hook for proactive refresh
   * This hook will be called before each authenticated request
   */
  setTokenValidationHook(hook: (() => Promise<void>) | null) {
    this.tokenValidationHook = hook;
  }

  // ==========================================================================
  // Auth Endpoints
  // ==========================================================================

  async signUp(data: SignUpRequest): Promise<SignUpResponse> {
    const response = await this.client.post<SignUpResponse>('/auth/signup', data);
    if (response.data.session?.access_token) {
      this.setAccessToken(response.data.session.access_token);
    }
    return response.data;
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/auth/login', data);
    if (response.data.session?.access_token) {
      this.setAccessToken(response.data.session.access_token);
    }
    return response.data;
  }

  async getUserProfile(): Promise<UserProfile> {
    const response = await this.client.get<UserProfile>('/auth/profile');
    return response.data;
  }

  async refreshToken(refreshToken: string): Promise<SessionToken> {
    const response = await this.client.post<{ access_token: string; refresh_token: string; token_type: string; expires_in: number }>(
      '/auth/refresh',
      { refresh_token: refreshToken }
    );

    const sessionToken: SessionToken = {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      token_type: 'bearer',
      expires_in: response.data.expires_in,
    };

    // Update the access token for future requests
    if (sessionToken.access_token) {
      this.setAccessToken(sessionToken.access_token);
    }

    return sessionToken;
  }

  // ==========================================================================
  // Theme Endpoints
  // ==========================================================================

  async getTodayTheme(category?: ThemeCategory): Promise<Theme> {
    const response = await this.client.get<Theme>('/themes/today', {
      params: category ? { category } : undefined,
    });
    return response.data;
  }

  async getThemes(params?: {
    date?: string;
    category?: ThemeCategory;
    limit?: number;
    offset?: number;
  }): Promise<ThemeListResponse> {
    const response = await this.client.get<ThemeListResponse>('/themes', {
      params,
    });
    return response.data;
  }

  async getThemeById(themeId: string): Promise<Theme> {
    const response = await this.client.get<Theme>(`/themes/${themeId}`);
    return response.data;
  }

  // ==========================================================================
  // Work (詠み) Endpoints
  // ==========================================================================

  async createWork(data: CreateWorkRequest): Promise<Work> {
    const response = await this.client.post<Work>('/works', data);
    return response.data;
  }

  async getWorksByTheme(themeId: string, params?: {
    limit?: number;
    order_by?: 'recent' | 'fair_score';
  }): Promise<WorkListResponse> {
    const response = await this.client.get<WorkListResponse>('/works', {
      params: { theme_id: themeId, ...params },
    });
    return response.data;
  }

  async likeWork(workId: string): Promise<WorkLikeResponse> {
    const response = await this.client.post<WorkLikeResponse>(`/works/${workId}/like`);
    return response.data;
  }

  async getMyWorks(params?: {
    theme_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<WorkListResponse> {
    const response = await this.client.get<WorkListResponse>('/works/me', {
      params,
    });
    return response.data;
  }

  async getMyWorksSummary(): Promise<WorkDateSummary[]> {
    const response = await this.client.get<WorkDateSummary[]>('/works/me/summary');
    return response.data;
  }

  async getWorkById(workId: string): Promise<Work> {
    const response = await this.client.get<Work>(`/works/${workId}`);
    return response.data;
  }

  // ==========================================================================
  // Resonance (共鳴) Endpoints
  // ==========================================================================

  async createResonance(data: CreateResonanceRequest): Promise<Resonance> {
    const response = await this.client.post<Resonance>('/resonances', data);
    return response.data;
  }

  async deleteResonance(workId: string): Promise<void> {
    await this.client.delete(`/resonances/${workId}`);
  }

  async getResonanceCount(workId: string): Promise<number> {
    const response = await this.client.get<{ count: number }>(`/resonances/${workId}/count`);
    return response.data.count;
  }

  // ==========================================================================
  // Ranking Endpoints
  // ==========================================================================

  async getRanking(themeId: string): Promise<RankingResponse> {
    const response = await this.client.get<RankingResponse>('/ranking', {
      params: { theme_id: themeId },
    });
    return response.data;
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const api = new ApiClient();
export default api;
