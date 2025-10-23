/**
 * Auth Store using Zustand
 * Manages authentication state and user session
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import type { SignUpRequest, LoginRequest, UserProfile } from '../types';

// ============================================================================
// Constants
// ============================================================================

const ACCESS_TOKEN_KEY = '@yomibiyori:accessToken';
const USER_PROFILE_KEY = '@yomibiyori:userProfile';

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

      // Store access token
      if (response.session?.access_token) {
        await AsyncStorage.setItem(ACCESS_TOKEN_KEY, response.session.access_token);
      }

      // Create user profile from response
      const userProfile: UserProfile = {
        user_id: response.user_id,
        email: response.email,
        display_name: response.display_name,
      };

      // Store user profile
      await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile));

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

      // Store access token
      if (response.session?.access_token) {
        await AsyncStorage.setItem(ACCESS_TOKEN_KEY, response.session.access_token);
      }

      // Create user profile from response
      const userProfile: UserProfile = {
        user_id: response.user_id,
        email: response.email,
        display_name: response.display_name,
      };

      // Store user profile
      await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile));

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
      // Clear stored credentials
      await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, USER_PROFILE_KEY]);

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
      const [accessToken, userProfileJson] = await AsyncStorage.multiGet([
        ACCESS_TOKEN_KEY,
        USER_PROFILE_KEY,
      ]);

      const token = accessToken[1];
      const profileData = userProfileJson[1];

      console.log('[Auth] Token found:', !!token);
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

          // Update stored profile
          await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(freshProfile));
        } catch (profileErr: any) {
          // Check if token has expired
          if (profileErr?.detail?.includes('expired')) {
            console.log('[Auth] Token verification failed, clearing session');
            // Token has expired, force logout
            await get().logout();
            return;
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
}));

export default useAuthStore;
