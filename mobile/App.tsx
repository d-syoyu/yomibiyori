/**
 * Yomibiyori Mobile App
 * 詠日和 - 詩的SNSアプリ
 */

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import {
  useFonts,
  NotoSerifJP_400Regular,
  NotoSerifJP_500Medium,
  NotoSerifJP_600SemiBold,
} from '@expo-google-fonts/noto-serif-jp';
import Navigation from './src/navigation';
import api from './src/services/api';
import useAuthStore from './src/stores/useAuthStore';
import LoadingScreen from './src/components/LoadingScreen';
import { initAnalytics, identifyUser } from './src/utils/analytics';
import { configureNotificationHandler, registerForPushNotifications } from './src/utils/pushNotifications';

// スプラッシュスクリーンを自動で非表示にしない
SplashScreen.preventAutoHideAsync();

configureNotificationHandler();

export default function App() {
  const [fontsLoaded] = useFonts({
    NotoSerifJP_400Regular,
    NotoSerifJP_500Medium,
    NotoSerifJP_600SemiBold,
  });
  const [appReady, setAppReady] = useState(false);
  const currentUserId = useAuthStore(state => state.user?.user_id);

  // ネイティブスプラッシュを非表示にしてローディング画面を表示
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  // フォント読み込み完了後、少し待ってからアプリを表示
  useEffect(() => {
    if (fontsLoaded) {
      const timer = setTimeout(() => {
        setAppReady(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded]);

  // Setup token validation hook for proactive refresh
  useEffect(() => {
    const ensureValidToken = useAuthStore.getState().ensureValidToken;
    api.setTokenValidationHook(ensureValidToken);
    console.log('[App] Token validation hook registered');

    return () => {
      api.setTokenValidationHook(null);
    };
  }, []);

  // Register Expo push token after login
  useEffect(() => {
    if (!currentUserId) {
      return;
    }
    registerForPushNotifications();
  }, [currentUserId]);

  // Check for OTA updates
  useEffect(() => {
    async function checkAndApplyUpdates() {
      if (__DEV__) {
        console.log('[Updates] Skipping update check in development');
        return;
      }

      try {
        console.log('[Updates] Current channel:', Updates.channel);
        console.log('[Updates] Runtime version:', Updates.runtimeVersion);
        console.log('[Updates] Update ID:', Updates.updateId);
        console.log('[Updates] Is embedded:', Updates.isEmbeddedLaunch);

        const update = await Updates.checkForUpdateAsync();
        console.log('[Updates] Check result:', update);

        if (update.isAvailable) {
          console.log('[Updates] New update available, downloading...');
          const fetchResult = await Updates.fetchUpdateAsync();
          console.log('[Updates] Fetch result:', fetchResult);

          Alert.alert(
            'アップデート完了',
            '新しいバージョンをダウンロードしました。アプリを再起動して適用しますか？',
            [
              { text: '後で', style: 'cancel' },
              { text: 'アプリを再起動', onPress: () => Updates.reloadAsync() },
            ]
          );
        } else {
          console.log('[Updates] No updates available');
        }
      } catch (error) {
        console.error('[Updates] Error checking for updates:', error);
      }
    }

    checkAndApplyUpdates();
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
            display_name: user.display_name,
          }).catch(error => {
            console.error('[App] Failed to identify user for analytics:', error);
          });
        }
      }
    });
  }, []);

  // アプリ準備完了までローディング画面を表示
  if (!appReady) {
    return <LoadingScreen />;
  }

  return (
    <>
      <Navigation />
      <StatusBar style="auto" />
    </>
  );
}
