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
import { initAnalytics, identifyUser } from './src/utils/analytics';

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

  // Initialize PostHog analytics
  useEffect(() => {
    initAnalytics().then((client) => {
      if (client) {
        console.log('[App] Analytics initialized');

        // Identify user if already logged in
        const user = useAuthStore.getState().user;
        if (user?.user_id) {
          identifyUser(user.user_id, {
            email: user.email,
            display_name: user.display_name,
          });
        }
      }
    });
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
