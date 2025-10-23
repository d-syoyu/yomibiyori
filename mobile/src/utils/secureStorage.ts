/**
 * Secure Storage Wrapper
 * Uses expo-secure-store for encrypted storage on iOS Keychain and Android Keystore
 */

import * as SecureStore from 'expo-secure-store';

/**
 * Securely store a value
 */
export async function setSecureItem(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error(`[SecureStorage] Failed to store ${key}:`, error);
    throw error;
  }
}

/**
 * Retrieve a securely stored value
 */
export async function getSecureItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error(`[SecureStorage] Failed to retrieve ${key}:`, error);
    return null;
  }
}

/**
 * Delete a securely stored value
 */
export async function deleteSecureItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error(`[SecureStorage] Failed to delete ${key}:`, error);
    throw error;
  }
}

/**
 * Delete multiple securely stored values
 */
export async function deleteSecureItems(keys: string[]): Promise<void> {
  try {
    await Promise.all(keys.map((key) => SecureStore.deleteItemAsync(key)));
  } catch (error) {
    console.error(`[SecureStorage] Failed to delete items:`, error);
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
    const values = await Promise.all(
      keys.map(async (key) => {
        const value = await SecureStore.getItemAsync(key);
        return [key, value] as [string, string | null];
      })
    );
    return values;
  } catch (error) {
    console.error(`[SecureStorage] Failed to retrieve items:`, error);
    throw error;
  }
}
