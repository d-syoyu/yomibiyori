/**
 * Profile Setup Store using Zustand
 * Manages profile setup completion state (initial setup wizard)
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// Constants
// ============================================================================

const PROFILE_SETUP_COMPLETED_KEY = 'yomibiyori.profileSetupCompleted';

// ============================================================================
// Store State Interface
// ============================================================================

interface ProfileSetupState {
  // State
  profileSetupCompleted: boolean;
  isLoading: boolean;

  // Actions
  loadProfileSetupStatus: () => Promise<void>;
  completeProfileSetup: () => Promise<void>;
  resetProfileSetup: () => Promise<void>;
}

// ============================================================================
// Zustand Store
// ============================================================================

export const useProfileSetupStore = create<ProfileSetupState>((set) => ({
  // Initial state
  profileSetupCompleted: false,
  isLoading: true,

  // Load profile setup completion status from AsyncStorage
  loadProfileSetupStatus: async () => {
    try {
      const completed = await AsyncStorage.getItem(PROFILE_SETUP_COMPLETED_KEY);
      set({
        profileSetupCompleted: completed === 'true',
        isLoading: false,
      });
    } catch (error) {
      console.error('[ProfileSetupStore] Failed to load status:', error);
      set({
        profileSetupCompleted: false,
        isLoading: false,
      });
    }
  },

  // Mark profile setup as completed
  completeProfileSetup: async () => {
    try {
      await AsyncStorage.setItem(PROFILE_SETUP_COMPLETED_KEY, 'true');
      set({ profileSetupCompleted: true });
    } catch (error) {
      console.error('[ProfileSetupStore] Failed to save completion:', error);
    }
  },

  // Reset profile setup (for testing)
  resetProfileSetup: async () => {
    try {
      await AsyncStorage.removeItem(PROFILE_SETUP_COMPLETED_KEY);
      set({ profileSetupCompleted: false });
    } catch (error) {
      console.error('[ProfileSetupStore] Failed to reset:', error);
    }
  },
}));

export default useProfileSetupStore;
