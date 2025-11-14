import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

import api from '../services/api';
import type { NotificationTokenRequest } from '../types';

let handlerConfigured = false;

export function configureNotificationHandler(): void {
  if (handlerConfigured) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  handlerConfigured = true;
}

export async function registerForPushNotifications(): Promise<void> {
  if (!Device.isDevice) {
    console.log('[Push] Physical device required for push notifications');
    return;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const permissionResult = await Notifications.requestPermissionsAsync();
      finalStatus = permissionResult.status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Notification permission not granted');
      return;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.expoConfig?.extra?.projectId ??
      Constants?.easConfig?.projectId;

    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const expoPushToken = tokenResponse.data;

    if (!expoPushToken) {
      console.warn('[Push] Expo push token is empty');
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const payload: NotificationTokenRequest = {
      expo_push_token: expoPushToken,
      platform: Platform.OS,
      device_id: Device.deviceName ?? Device.modelName ?? undefined,
      app_version: Constants.expoConfig?.version,
    };

    await api.registerNotificationToken(payload);
    console.log('[Push] Expo push token registered successfully');
  } catch (error) {
    console.error('[Push] Failed to register push token:', error);
  }
}
