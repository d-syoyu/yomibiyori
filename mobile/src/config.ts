/**
 * Lightweight configuration helpers for the React Native app.
 */

// Base API endpoint (used by the legacy ShareSheet and other utilities)
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'https://yomibiyori-production.up.railway.app/api/v1';

// Development flag injected by Metro
export const IS_DEV = __DEV__;

// Static app version reference for places outside Expo constants
export const APP_VERSION = '1.0.0';
