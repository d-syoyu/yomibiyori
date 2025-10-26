import type { ExpoConfig } from '@expo/config';
import 'dotenv/config';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1';

const config: ExpoConfig = {
  expo: {
    name: 'Yomibiyori',
    slug: 'yomibiyori',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.yomibiyori.app',
    },
    android: {
      package: 'com.yomibiyori.app',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: ['expo-font', 'expo-secure-store'],
    extra: {
      apiBaseUrl: API_BASE_URL,
      eas: {
        projectId: 'da2c3e4e-0129-4a61-8b63-1491fa1d3a1a',
      },
    },
  },
};

export default config;
