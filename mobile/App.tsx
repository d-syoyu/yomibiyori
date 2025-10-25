/**
 * Yomibiyori Mobile App
 * 詠日和 - 詩的SNSアプリ
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import {
  useFonts,
  NotoSerifJP_400Regular,
  NotoSerifJP_500Medium,
  NotoSerifJP_600SemiBold,
} from '@expo-google-fonts/noto-serif-jp';
import Navigation from './src/navigation';
import api from './src/services/api';
import useAuthStore from './src/stores/useAuthStore';
import { setupNotificationListeners, registerPushToken } from './src/utils/notifications';

export default function App() {
  const [fontsLoaded] = useFonts({
    NotoSerifJP_400Regular,
    NotoSerifJP_500Medium,
    NotoSerifJP_600SemiBold,
  });

  // Setup token validation hook for proactive refresh
  useEffect(() => {
    const ensureValidToken = useAuthStore.getState().ensureValidToken;
    api.setTokenValidationHook(ensureValidToken);
    console.log('[App] Token validation hook registered');

    return () => {
      api.setTokenValidationHook(null);
    };
  }, []);

  // Setup push notifications
  useEffect(() => {
    const cleanup = setupNotificationListeners();

    // Register push token when user is authenticated
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (state.isAuthenticated && state.user) {
        registerPushToken().catch((error) => {
          console.error('[App] Failed to register push token:', error);
        });
      }
    });

    return () => {
      cleanup();
      unsubscribe();
    };
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4A5568" />
      </View>
    );
  }

  return (
    <>
      <Navigation />
      <StatusBar style="auto" />
    </>
  );
}
