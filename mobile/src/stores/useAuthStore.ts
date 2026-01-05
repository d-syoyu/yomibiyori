/**
 * Auth Store using Zustand
 * Manages authentication state and user session
 * Uses SecureStore for encrypted token storage (iOS Keychain / Android Keystore)
 */

import { create } from 'zustand';
import api from '../services/api';
import {
  setSecureItem,
  getSecureItems,
  deleteSecureItems,
} from '../utils/secureStorage';
import type { SignUpRequest, LoginRequest, UserProfile, OAuthCallbackRequest, UpdateProfileRequest, ApiError } from '../types';
import { resetAnalytics, setAnalyticsUserContext, identifyUser } from '../utils/analytics';
import { logger } from '../utils/logger';
import { IS_DEV } from '../config';

// ============================================================================
// Development Test User (Expo Go用)
// ============================================================================

const DEV_TEST_USER: UserProfile = {
  user_id: '00000000-0000-0000-0000-000000000001',
  email: 'test@example.com',
  display_name: 'テストユーザー',
  analytics_opt_out: true,
  notify_theme_release: false,
  notify_ranking_result: false,
};

// ============================================================================
// Constants
// ============================================================================

const ACCESS_TOKEN_KEY = 'yomibiyori.accessToken';
const REFRESH_TOKEN_KEY = 'yomibiyori.refreshToken';
const TOKEN_EXPIRES_AT_KEY = 'yomibiyori.tokenExpiresAt';
const USER_PROFILE_KEY = 'yomibiyori.userProfile';

// Refresh token proactively when less than 5 minutes remain
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

// Global flag to prevent concurrent refresh attempts
let isRefreshing = false;

// ============================================================================
// Store State Interface
// ============================================================================

interface AuthState {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  error: string | null;

  // Actions
  signUp: (data: SignUpRequest) => Promise<void>;
  login: (data: LoginRequest) => Promise<void>;
  loginWithOAuth: (data: OAuthCallbackRequest) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredSession: () => Promise<void>;
  updateProfile: (data: UpdateProfileRequest) => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
  ensureValidToken: () => Promise<void>;
}

// ============================================================================
// Zustand Store
// ============================================================================

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  isAuthenticated: false,
  isLoading: false,
  user: null,
  error: null,

  // Sign up new user
  signUp: async (data: SignUpRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.signUp(data);

      // Store access token and refresh token securely
      if (response.session?.access_token) {
        await setSecureItem(ACCESS_TOKEN_KEY, response.session.access_token);
      }
      if (response.session?.refresh_token) {
        await setSecureItem(REFRESH_TOKEN_KEY, response.session.refresh_token);
      }

      // Calculate and store token expiration time
      if (response.session?.expires_in) {
        const expiresAt = Date.now() + response.session.expires_in * 1000;
        await setSecureItem(TOKEN_EXPIRES_AT_KEY, expiresAt.toString());
      }

      // Create user profile from response
      const userProfile: UserProfile = {
        user_id: response.user_id,
        email: response.email,
        display_name: response.display_name,
        analytics_opt_out: false,
        notify_theme_release: true,
        notify_ranking_result: true,
      };

      // Store user profile securely
      await setSecureItem(USER_PROFILE_KEY, JSON.stringify(userProfile));

      // Set analytics user context for sample account detection
      setAnalyticsUserContext(userProfile.email);

      set({
        isAuthenticated: true,
        user: userProfile,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const apiError = err as ApiError;
      const errorMessage = apiError.detail || 'サインアップに失敗しました';
      set({
        isLoading: false,
        error: errorMessage,
        isAuthenticated: false,
      });
      throw err;
    }
  },

  // Login existing user
  login: async (data: LoginRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.login(data);

      // Store access token and refresh token securely
      if (response.session?.access_token) {
        await setSecureItem(ACCESS_TOKEN_KEY, response.session.access_token);
      }
      if (response.session?.refresh_token) {
        await setSecureItem(REFRESH_TOKEN_KEY, response.session.refresh_token);
      }

      // Calculate and store token expiration time
      if (response.session?.expires_in) {
        const expiresAt = Date.now() + response.session.expires_in * 1000;
        await setSecureItem(TOKEN_EXPIRES_AT_KEY, expiresAt.toString());
      }

      // Create user profile from response
      const userProfile: UserProfile = {
        user_id: response.user_id,
        email: response.email,
        display_name: response.display_name,
        analytics_opt_out: false,
        notify_theme_release: true,
        notify_ranking_result: true,
      };

      // Store user profile securely
      await setSecureItem(USER_PROFILE_KEY, JSON.stringify(userProfile));

      // Set analytics user context for sample account detection
      setAnalyticsUserContext(userProfile.email);

      set({
        isAuthenticated: true,
        user: userProfile,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const apiError = err as ApiError;
      const errorMessage = apiError.detail || 'ログインに失敗しました';
      set({
        isLoading: false,
        error: errorMessage,
        isAuthenticated: false,
      });
      throw err;
    }
  },

  // Login with OAuth (Google)
  loginWithOAuth: async (data: OAuthCallbackRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.processOAuthCallback(data);

      // Store access token and refresh token securely
      if (response.session?.access_token) {
        await setSecureItem(ACCESS_TOKEN_KEY, response.session.access_token);
      }
      if (response.session?.refresh_token) {
        await setSecureItem(REFRESH_TOKEN_KEY, response.session.refresh_token);
      }

      // Calculate and store token expiration time
      if (response.session?.expires_in) {
        const expiresAt = Date.now() + response.session.expires_in * 1000;
        await setSecureItem(TOKEN_EXPIRES_AT_KEY, expiresAt.toString());
      }

      // Create user profile from response
      const userProfile: UserProfile = {
        user_id: response.user_id,
        email: response.email,
        display_name: response.display_name,
        analytics_opt_out: false,
        notify_theme_release: true,
        notify_ranking_result: true,
      };

      // Store user profile securely
      await setSecureItem(USER_PROFILE_KEY, JSON.stringify(userProfile));

      // Set analytics user context for sample account detection
      setAnalyticsUserContext(userProfile.email);

      set({
        isAuthenticated: true,
        user: userProfile,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const apiError = err as ApiError;
      const errorMessage = apiError.detail || 'OAuthログインに失敗しました';
      set({
        isLoading: false,
        error: errorMessage,
        isAuthenticated: false,
      });
      throw err;
    }
  },

  // Logout user
  logout: async () => {
    set({ isLoading: true });
    try {
      // Clear stored credentials securely (including refresh token and expiration)
      await deleteSecureItems([
        ACCESS_TOKEN_KEY,
        REFRESH_TOKEN_KEY,
        TOKEN_EXPIRES_AT_KEY,
        USER_PROFILE_KEY,
      ]);

      // Clear API token
      api.setAccessToken(null);
      resetAnalytics();

      set({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      logger.error('Logout error:', err);
      set({ isLoading: false });
    }
  },

  // Load stored session on app start
  loadStoredSession: async () => {
    logger.debug('[Auth] Loading stored session...');
    set({ isLoading: true });

    // 開発モード (Expo Go) ではテストユーザーで自動ログイン
    if (IS_DEV) {
      logger.debug('[Auth] Development mode: Using test user');
      set({
        isAuthenticated: true,
        user: DEV_TEST_USER,
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      const items = await getSecureItems([
        ACCESS_TOKEN_KEY,
        REFRESH_TOKEN_KEY,
        USER_PROFILE_KEY,
      ]);

      const token = items.find(([key]) => key === ACCESS_TOKEN_KEY)?.[1];
      const refresh = items.find(([key]) => key === REFRESH_TOKEN_KEY)?.[1];
      const profileData = items.find(([key]) => key === USER_PROFILE_KEY)?.[1];

      logger.debug('[Auth] Token found:', !!token);
      logger.debug('[Auth] Refresh token found:', !!refresh);
      logger.debug('[Auth] Profile data found:', !!profileData);

      if (token && profileData) {
        // Set API token
        api.setAccessToken(token);
        logger.debug('[Auth] API token set');

        // Parse user profile
        const parsedUser = JSON.parse(profileData) as Partial<UserProfile>;
        const user: UserProfile = {
          analytics_opt_out: false,
          notify_theme_release: true,
          notify_ranking_result: true,
          ...parsedUser,
        } as UserProfile;
        logger.debug('[Auth] User profile parsed:', user.email);

        // Try to verify token, but fall back to cached profile if verification fails
        try {
          logger.debug('[Auth] Verifying token...');
          const freshProfile = await api.getUserProfile();
          logger.debug('[Auth] Token verified successfully');

          // Set analytics user context for sample account detection
          setAnalyticsUserContext(freshProfile.email);

          // Identify user in PostHog to merge anonymous events
          if (freshProfile.user_id) {
            await identifyUser(freshProfile.user_id, {
              display_name: freshProfile.display_name,
            });
          }

          set({
            isAuthenticated: true,
            user: freshProfile,
            isLoading: false,
            error: null,
          });

          // Update stored profile securely
          await setSecureItem(USER_PROFILE_KEY, JSON.stringify(freshProfile));
        } catch (profileErr: unknown) {
          const apiError = profileErr as ApiError;
          // Check if token has expired
          if (apiError?.detail?.includes('expired')) {
            logger.debug('[Auth] Token expired, attempting to refresh...');

            // Try to refresh the token
            if (refresh) {
              try {
                logger.debug('[Auth] Refreshing token...');
                const newSession = await api.refreshToken(refresh);
                logger.debug('[Auth] Token refreshed successfully');

                // Store new tokens securely
                if (newSession.access_token) {
                  await setSecureItem(ACCESS_TOKEN_KEY, newSession.access_token);
                }
                if (newSession.refresh_token) {
                  await setSecureItem(REFRESH_TOKEN_KEY, newSession.refresh_token);
                }

                // Store new expiration time
                if (newSession.expires_in) {
                  const expiresAt = Date.now() + newSession.expires_in * 1000;
                  await setSecureItem(TOKEN_EXPIRES_AT_KEY, expiresAt.toString());
                }

                // Verify with new token
                const freshProfile = await api.getUserProfile();
                logger.debug('[Auth] Profile fetched with new token');

                // Set analytics user context for sample account detection
                setAnalyticsUserContext(freshProfile.email);

                // Identify user in PostHog to merge anonymous events
                if (freshProfile.user_id) {
                  await identifyUser(freshProfile.user_id, {
                    display_name: freshProfile.display_name,
                  });
                }

                set({
                  isAuthenticated: true,
                  user: freshProfile,
                  isLoading: false,
                  error: null,
                });

                // Update stored profile securely
                await setSecureItem(USER_PROFILE_KEY, JSON.stringify(freshProfile));
                return;
              } catch (refreshErr: unknown) {
                logger.debug('[Auth] Token refresh failed, logging out');
                logger.debug('[Auth] Refresh error:', refreshErr);
                // Refresh failed, force logout
                await get().logout();
                return;
              }
            } else {
              logger.debug('[Auth] No refresh token available, logging out');
              // No refresh token, force logout
              await get().logout();
              return;
            }
          }

          // Other errors: use cached profile anyway
          logger.debug('[Auth] Token verification failed, using cached profile');
          logger.debug('[Auth] Error:', profileErr);

          // Set analytics user context for sample account detection
          setAnalyticsUserContext(user.email);

          // Identify user in PostHog to merge anonymous events
          if (user.user_id) {
            await identifyUser(user.user_id, {
              display_name: user.display_name,
            });
          }

          // Use cached profile for now
          set({
            isAuthenticated: true,
            user: user,
            isLoading: false,
            error: null,
          });
        }
      } else {
        logger.debug('[Auth] No stored session found');
        set({ isLoading: false, isAuthenticated: false });
      }
    } catch (err: unknown) {
      logger.error('[Auth] Load session error:', err);
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  // Update user profile
  updateProfile: async (data: UpdateProfileRequest) => {
    set({ isLoading: true, error: null });
    try {
      const updatedProfile = await api.updateProfile(data);

      // Update stored profile securely
      await setSecureItem(USER_PROFILE_KEY, JSON.stringify(updatedProfile));

      set({
        user: updatedProfile,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const apiError = err as ApiError;
      const errorMessage = apiError.detail || 'プロフィールの更新に失敗しました';
      set({
        isLoading: false,
        error: errorMessage,
      });
      throw err;
    }
  },

  // Refresh user profile from API (used after avatar upload etc.)
  refreshProfile: async () => {
    try {
      const freshProfile = await api.getUserProfile();

      // Update stored profile securely
      await setSecureItem(USER_PROFILE_KEY, JSON.stringify(freshProfile));

      set({
        user: freshProfile,
      });

      logger.debug('[Auth] Profile refreshed successfully');
    } catch (err: unknown) {
      logger.error('[Auth] Failed to refresh profile:', err);
      // Don't throw - just log the error
    }
  },

  // Clear error message
  clearError: () => {
    set({ error: null });
  },

  // Ensure token is valid (proactive refresh)
  ensureValidToken: async () => {
    // Prevent concurrent refresh attempts
    if (isRefreshing) {
      logger.debug('[Auth] Refresh already in progress, skipping');
      return;
    }

    try {
      // Get token expiration time
      const items = await getSecureItems([TOKEN_EXPIRES_AT_KEY, REFRESH_TOKEN_KEY]);
      const expiresAtStr = items.find(([key]) => key === TOKEN_EXPIRES_AT_KEY)?.[1];
      const refreshToken = items.find(([key]) => key === REFRESH_TOKEN_KEY)?.[1];

      if (!expiresAtStr || !refreshToken) {
        // No expiration info or refresh token, skip proactive refresh
        return;
      }

      const expiresAt = parseInt(expiresAtStr, 10);
      const now = Date.now();
      const timeRemaining = expiresAt - now;

      logger.debug('[Auth] Token expires in:', Math.floor(timeRemaining / 1000), 'seconds');

      // If token is already expired or expiring soon, refresh it proactively
      if (timeRemaining < 0) {
        logger.debug('[Auth] Token already expired, attempting refresh...');
      } else if (timeRemaining < TOKEN_REFRESH_THRESHOLD_MS) {
        logger.debug('[Auth] Token expiring soon, refreshing proactively...');
      } else {
        // Token is still valid and not expiring soon
        return;
      }

      // Attempt to refresh the token
      // Set refreshing flag
      isRefreshing = true;

      try {
        const newSession = await api.refreshToken(refreshToken);
        logger.debug('[Auth] Token refreshed successfully');

        // Store new tokens securely
        if (newSession.access_token) {
          await setSecureItem(ACCESS_TOKEN_KEY, newSession.access_token);
          api.setAccessToken(newSession.access_token); // Update API client token immediately
        }
        if (newSession.refresh_token) {
          await setSecureItem(REFRESH_TOKEN_KEY, newSession.refresh_token);
        }

        // Store new expiration time
        if (newSession.expires_in) {
          const newExpiresAt = Date.now() + newSession.expires_in * 1000;
          await setSecureItem(TOKEN_EXPIRES_AT_KEY, newExpiresAt.toString());
        }
      } catch (refreshErr: unknown) {
        const apiError = refreshErr as ApiError;
        logger.error('[Auth] Token refresh failed:', refreshErr);
        // Check if it's an auth error (refresh token expired)
        if (apiError?.status === 401 || apiError?.detail?.includes('expired')) {
          logger.debug('[Auth] Refresh token expired, logging out');
          await get().logout();
        }
        // For other errors, let the request proceed and handle it there
      } finally {
        // Clear refreshing flag
        isRefreshing = false;
      }
    } catch (err: unknown) {
      logger.error('[Auth] ensureValidToken error:', err);
      isRefreshing = false;
      // Don't throw, let the request proceed
    }
  },
}));

export default useAuthStore;
