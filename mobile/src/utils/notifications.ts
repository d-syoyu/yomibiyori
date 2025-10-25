/**
 * Push notification utilities for Expo
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from '../services/api';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Request push notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Notifications] Permission not granted');
    return false;
  }

  return true;
}

/**
 * Get Expo push token for this device
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    if (!projectId) {
      console.error('[Notifications] No EAS project ID found in app config');
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    return token.data;
  } catch (error) {
    console.error('[Notifications] Error getting push token:', error);
    return null;
  }
}

/**
 * Register push token with the backend
 */
export async function registerPushToken(): Promise<boolean> {
  try {
    // Request permissions first
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.warn('[Notifications] User denied notification permissions');
      return false;
    }

    // Get Expo push token
    const token = await getExpoPushToken();
    if (!token) {
      console.error('[Notifications] Could not obtain push token');
      return false;
    }

    console.log('[Notifications] Expo push token:', token);

    // Register with backend
    await api.registerPushToken({ expo_token: token });
    console.log('[Notifications] Push token registered successfully');

    return true;
  } catch (error) {
    console.error('[Notifications] Error registering push token:', error);
    return false;
  }
}

/**
 * Set up notification listeners
 */
export function setupNotificationListeners() {
  // Handle notification received while app is in foreground
  const foregroundSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log('[Notifications] Notification received:', notification);
    }
  );

  // Handle user tapping on notification
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      console.log('[Notifications] User tapped notification:', response);
      // TODO: Navigate to relevant screen based on notification data
    }
  );

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}
