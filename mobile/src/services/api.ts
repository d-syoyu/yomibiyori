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
  Theme,
  ThemeListResponse,
  ThemeCategory,
  CreateWorkRequest,
  Work,
  WorkListResponse,
  WorkLikeResponse,
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

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
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
    const response = await this.client.get<UserProfile>('/auth/me');
    return response.data;
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
