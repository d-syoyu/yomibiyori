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
import type { SignUpRequest, LoginRequest, UserProfile } from '../types';

// ============================================================================
// Constants
// ============================================================================

const ACCESS_TOKEN_KEY = 'yomibiyori.accessToken';
const REFRESH_TOKEN_KEY = 'yomibiyori.refreshToken';
const TOKEN_EXPIRES_AT_KEY = 'yomibiyori.tokenExpiresAt';
const USER_PROFILE_KEY = 'yomibiyori.userProfile';

// Refresh token proactively when less than 5 minutes remain
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

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
  logout: () => Promise<void>;
  loadStoredSession: () => Promise<void>;
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
      };

      // Store user profile securely
      await setSecureItem(USER_PROFILE_KEY, JSON.stringify(userProfile));

      set({
        isAuthenticated: true,
        user: userProfile,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      const errorMessage = err.detail || 'サインアップに失敗しました';
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
      };

      // Store user profile securely
      await setSecureItem(USER_PROFILE_KEY, JSON.stringify(userProfile));

      set({
        isAuthenticated: true,
        user: userProfile,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      const errorMessage = err.detail || 'ログインに失敗しました';
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

      set({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      console.error('Logout error:', err);
      set({ isLoading: false });
    }
  },

  // Load stored session on app start
  loadStoredSession: async () => {
    console.log('[Auth] Loading stored session...');
    set({ isLoading: true });
    try {
      const items = await getSecureItems([
        ACCESS_TOKEN_KEY,
        REFRESH_TOKEN_KEY,
        USER_PROFILE_KEY,
      ]);

      const token = items.find(([key]) => key === ACCESS_TOKEN_KEY)?.[1];
      const refresh = items.find(([key]) => key === REFRESH_TOKEN_KEY)?.[1];
      const profileData = items.find(([key]) => key === USER_PROFILE_KEY)?.[1];

      console.log('[Auth] Token found:', !!token);
      console.log('[Auth] Refresh token found:', !!refresh);
      console.log('[Auth] Profile data found:', !!profileData);

      if (token && profileData) {
        // Set API token
        api.setAccessToken(token);
        console.log('[Auth] API token set');

        // Parse user profile
        const user: UserProfile = JSON.parse(profileData);
        console.log('[Auth] User profile parsed:', user.email);

        // Try to verify token, but fall back to cached profile if verification fails
        try {
          console.log('[Auth] Verifying token...');
          const freshProfile = await api.getUserProfile();
          console.log('[Auth] Token verified successfully');

          set({
            isAuthenticated: true,
            user: freshProfile,
            isLoading: false,
            error: null,
          });

          // Update stored profile securely
          await setSecureItem(USER_PROFILE_KEY, JSON.stringify(freshProfile));
        } catch (profileErr: any) {
          // Check if token has expired
          if (profileErr?.detail?.includes('expired')) {
            console.log('[Auth] Token expired, attempting to refresh...');

            // Try to refresh the token
            if (refresh) {
              try {
                console.log('[Auth] Refreshing token...');
                const newSession = await api.refreshToken(refresh);
                console.log('[Auth] Token refreshed successfully');

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
                console.log('[Auth] Profile fetched with new token');

                set({
                  isAuthenticated: true,
                  user: freshProfile,
                  isLoading: false,
                  error: null,
                });

                // Update stored profile securely
                await setSecureItem(USER_PROFILE_KEY, JSON.stringify(freshProfile));
                return;
              } catch (refreshErr: any) {
                console.log('[Auth] Token refresh failed, logging out');
                console.log('[Auth] Refresh error:', refreshErr);
                // Refresh failed, force logout
                await get().logout();
                return;
              }
            } else {
              console.log('[Auth] No refresh token available, logging out');
              // No refresh token, force logout
              await get().logout();
              return;
            }
          }

          // Other errors: use cached profile anyway
          console.log('[Auth] Token verification failed, using cached profile');
          console.log('[Auth] Error:', profileErr);

          // Use cached profile for now
          set({
            isAuthenticated: true,
            user: user,
            isLoading: false,
            error: null,
          });
        }
      } else {
        console.log('[Auth] No stored session found');
        set({ isLoading: false, isAuthenticated: false });
      }
    } catch (err: any) {
      console.error('[Auth] Load session error:', err);
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  // Clear error message
  clearError: () => {
    set({ error: null });
  },

  // Ensure token is valid (proactive refresh)
  ensureValidToken: async () => {
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

      console.log('[Auth] Token expires in:', Math.floor(timeRemaining / 1000), 'seconds');

      // If token expires soon, refresh it proactively
      if (timeRemaining < TOKEN_REFRESH_THRESHOLD_MS) {
        console.log('[Auth] Token expiring soon, refreshing proactively...');

        try {
          const newSession = await api.refreshToken(refreshToken);
          console.log('[Auth] Token refreshed proactively');

          // Store new tokens securely
          if (newSession.access_token) {
            await setSecureItem(ACCESS_TOKEN_KEY, newSession.access_token);
          }
          if (newSession.refresh_token) {
            await setSecureItem(REFRESH_TOKEN_KEY, newSession.refresh_token);
          }

          // Store new expiration time
          if (newSession.expires_in) {
            const newExpiresAt = Date.now() + newSession.expires_in * 1000;
            await setSecureItem(TOKEN_EXPIRES_AT_KEY, newExpiresAt.toString());
          }
        } catch (refreshErr: any) {
          console.error('[Auth] Proactive token refresh failed:', refreshErr);
          // Check if it's an auth error (refresh token expired)
          if (refreshErr?.status === 401 || refreshErr?.detail?.includes('expired')) {
            console.log('[Auth] Refresh token expired, logging out');
            await get().logout();
          }
          // For other errors, let the request proceed and handle it there
        }
      }
    } catch (err: any) {
      console.error('[Auth] ensureValidToken error:', err);
      // Don't throw, let the request proceed
    }
  },
}));

export default useAuthStore;
