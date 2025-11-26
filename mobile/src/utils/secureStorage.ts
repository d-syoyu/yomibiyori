/**
 * Secure Storage Wrapper
 * Uses expo-secure-store for encrypted storage on iOS Keychain and Android Keystore
 * Falls back to localStorage for web
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { logger } from './logger';

// Check if we're running on web
const isWeb = Platform.OS === 'web';

/**
 * Securely store a value
 */
export async function setSecureItem(key: string, value: string): Promise<void> {
  try {
    if (isWeb) {
      // Use localStorage for web
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  } catch (error) {
    logger.error(`[SecureStorage] Failed to store ${key}:`, error);
    throw error;
  }
}

/**
 * Retrieve a securely stored value
 */
export async function getSecureItem(key: string): Promise<string | null> {
  try {
    if (isWeb) {
      // Use localStorage for web
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    } else {
      return await SecureStore.getItemAsync(key);
    }
  } catch (error) {
    logger.error(`[SecureStorage] Failed to retrieve ${key}:`, error);
    return null;
  }
}

/**
 * Delete a securely stored value
 */
export async function deleteSecureItem(key: string): Promise<void> {
  try {
    if (isWeb) {
      // Use localStorage for web
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  } catch (error) {
    logger.error(`[SecureStorage] Failed to delete ${key}:`, error);
    throw error;
  }
}

/**
 * Delete multiple securely stored values
 */
export async function deleteSecureItems(keys: string[]): Promise<void> {
  try {
    if (isWeb) {
      // Use localStorage for web
      if (typeof window !== 'undefined' && window.localStorage) {
        keys.forEach(key => window.localStorage.removeItem(key));
      }
    } else {
      await Promise.all(keys.map((key) => SecureStore.deleteItemAsync(key)));
    }
  } catch (error) {
    logger.error(`[SecureStorage] Failed to delete items:`, error);
    throw error;
  }
}

/**
 * Get multiple securely stored values
 */
export async function getSecureItems(
  keys: string[]
): Promise<Array<[string, string | null]>> {
  try {
    if (isWeb) {
      // Use localStorage for web
      if (typeof window !== 'undefined' && window.localStorage) {
        return keys.map(key => [key, window.localStorage.getItem(key)] as [string, string | null]);
      }
      return keys.map(key => [key, null] as [string, string | null]);
    } else {
      const values = await Promise.all(
        keys.map(async (key) => {
          const value = await SecureStore.getItemAsync(key);
          return [key, value] as [string, string | null];
        })
      );
      return values;
    }
  } catch (error) {
    logger.error(`[SecureStorage] Failed to retrieve items:`, error);
    throw error;
  }
}
