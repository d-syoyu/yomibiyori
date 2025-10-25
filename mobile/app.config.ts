import type { ExpoConfig } from '@expo/config';
import 'dotenv/config';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1';
const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID;

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
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-font',
      'expo-secure-store',
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#4A5568',
        },
      ],
    ],
    extra: {
      apiBaseUrl: API_BASE_URL,
      eas: {
        projectId: EAS_PROJECT_ID,
      },
    },
  },
};

export default config;
