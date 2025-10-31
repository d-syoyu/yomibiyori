import type { ExpoConfig } from '@expo/config';
import 'dotenv/config';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1';

const config: ExpoConfig = {
  expo: {
    name: 'よみびより',
    slug: 'yomibiyori',
    version: '1.0.1',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    scheme: 'yomibiyori',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.yomibiyori.app',
      config: {
        usesNonExemptEncryption: false,
      },
    },
    android: {
      package: 'com.yomibiyori.app',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            {
              scheme: 'yomibiyori',
              host: 'auth',
              pathPrefix: '/callback',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: ['expo-font', 'expo-secure-store'],
    // Commented out for Expo Go development
    // updates: {
    //   url: 'https://u.expo.dev/da2c3e4e-0129-4a61-8b63-1491fa1d3a1a',
    // },
    // runtimeVersion: {
    //   policy: 'appVersion',
    // },
    extra: {
      apiBaseUrl: API_BASE_URL,
      eas: {
        projectId: 'da2c3e4e-0129-4a61-8b63-1491fa1d3a1a',
      },
    },
  },
};

export default config;
