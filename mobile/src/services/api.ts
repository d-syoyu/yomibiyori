/**
 * API Client for Yomibiyori Backend
 * Connects to Railway-hosted FastAPI backend
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import Constants from 'expo-constants';
import type {
  SignUpRequest,
  SignUpResponse,
  LoginRequest,
  LoginResponse,
  UserProfile,
  SessionToken,
  OAuthUrlResponse,
  OAuthCallbackRequest,
  OAuthCallbackResponse,
  UpdateProfileRequest,
  Theme,
  ThemeListResponse,
  ThemeCategory,
  CreateWorkRequest,
  Work,
  WorkListResponse,
  WorkLikeResponse,
  WorkDateSummary,
  RankingResponse,
  ApiError,
} from '../types';

// ============================================================================
// Configuration
// ============================================================================

type ExpoExtra = {
  apiBaseUrl?: string;
};

const extra = (Constants.expoConfig?.extra ?? Constants.manifest?.extra ?? {}) as ExpoExtra;

const API_BASE_URL =
  extra.apiBaseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1';

// ============================================================================
// Axios Instance
// ============================================================================

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504]; // Retryable status codes

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

    // Response interceptor for error handling and retry logic
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiError>) => {
        const config = error.config as any;

        // Initialize retry count
        if (!config._retryCount) {
          config._retryCount = 0;
        }

        // Determine if we should retry
        const shouldRetry = this.shouldRetryRequest(error, config._retryCount);

        if (shouldRetry && config._retryCount < MAX_RETRIES) {
          config._retryCount += 1;

          console.log(
            `[API] Retrying request (${config._retryCount}/${MAX_RETRIES}):`,
            config.url
          );

          // Wait before retrying (exponential backoff)
          const delay = RETRY_DELAY * Math.pow(2, config._retryCount - 1);
          await this.sleep(delay);

          // Retry the request
          return this.client(config);
        }

        // No retry - format and reject the error
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
   * Determine if a request should be retried
   */
  private shouldRetryRequest(error: AxiosError, retryCount: number): boolean {
    // Don't retry if we've exceeded max retries
    if (retryCount >= MAX_RETRIES) {
      return false;
    }

    // Don't retry if request was cancelled
    if (axios.isCancel(error)) {
      return false;
    }

    // Retry on network errors (no response)
    if (!error.response) {
      return true;
    }

    // Retry on specific status codes
    const status = error.response.status;
    if (RETRY_STATUS_CODES.includes(status)) {
      return true;
    }

    return false;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

  async updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
    const response = await this.client.patch<UserProfile>('/auth/profile', data);
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

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const response = await this.client.post<{ message: string }>(
      '/auth/password-reset',
      { email }
    );
    return response.data;
  }

  async updatePassword(newPassword: string): Promise<{ message: string }> {
    const response = await this.client.post<{ message: string }>(
      '/auth/password-update',
      { new_password: newPassword }
    );
    return response.data;
  }

  async getGoogleOAuthUrl(redirectTo?: string): Promise<OAuthUrlResponse> {
    const response = await this.client.get<OAuthUrlResponse>('/auth/oauth/google', {
      params: redirectTo ? { redirect_to: redirectTo } : undefined,
    });
    return response.data;
  }

  async processOAuthCallback(data: OAuthCallbackRequest): Promise<OAuthCallbackResponse> {
    const response = await this.client.post<OAuthCallbackResponse>('/auth/oauth/callback', data);
    if (response.data.session?.access_token) {
      this.setAccessToken(response.data.session.access_token);
    }
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

  async getMyWorksSummary(): Promise<WorkDateSummary[]> {
    const response = await this.client.get<WorkDateSummary[]>('/works/me/summary');
    return response.data;
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
