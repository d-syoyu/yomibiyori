/**
 * Tutorial Store using Zustand
 * Manages tutorial completion state
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// Constants
// ============================================================================

const TUTORIAL_COMPLETED_KEY = 'yomibiyori.tutorialCompleted';

// ============================================================================
// Store State Interface
// ============================================================================

interface TutorialState {
  // State
  tutorialCompleted: boolean;
  isLoading: boolean;

  // Actions
  loadTutorialStatus: () => Promise<void>;
  completeTutorial: () => Promise<void>;
  resetTutorial: () => Promise<void>;
}

// ============================================================================
// Zustand Store
// ============================================================================

export const useTutorialStore = create<TutorialState>((set) => ({
  // Initial state
  tutorialCompleted: false,
  isLoading: true,

  // Load tutorial completion status from AsyncStorage
  loadTutorialStatus: async () => {
    try {
      const completed = await AsyncStorage.getItem(TUTORIAL_COMPLETED_KEY);
      set({
        tutorialCompleted: completed === 'true',
        isLoading: false,
      });
      console.log('[TutorialStore] Tutorial status loaded:', completed === 'true');
    } catch (error) {
      console.error('[TutorialStore] Failed to load tutorial status:', error);
      set({
        tutorialCompleted: false,
        isLoading: false,
      });
    }
  },

  // Mark tutorial as completed
  completeTutorial: async () => {
    try {
      await AsyncStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true');
      set({ tutorialCompleted: true });
      console.log('[TutorialStore] Tutorial marked as completed');
    } catch (error) {
      console.error('[TutorialStore] Failed to save tutorial completion:', error);
    }
  },

  // Reset tutorial (for testing or user request)
  resetTutorial: async () => {
    try {
      await AsyncStorage.removeItem(TUTORIAL_COMPLETED_KEY);
      set({ tutorialCompleted: false });
      console.log('[TutorialStore] Tutorial reset');
    } catch (error) {
      console.error('[TutorialStore] Failed to reset tutorial:', error);
    }
  },
}));

export default useTutorialStore;
