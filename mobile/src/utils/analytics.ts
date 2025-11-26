/**
 * Analytics Utility
 * PostHog integration for event tracking
 */

import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import PostHog from 'posthog-react-native';
import { logger } from './logger';

let posthogClient: PostHog | null = null;
const expoExtra = (Constants.expoConfig?.extra ?? {}) as {
  posthogApiKey?: string;
  posthogHost?: string;
};
const manifestExtra =
  (Constants.manifest && typeof Constants.manifest === 'object' && 'extra' in Constants.manifest
    ? (Constants.manifest as { extra?: typeof expoExtra }).extra
    : {}) ?? {};
const extra = {
  ...manifestExtra,
  ...expoExtra,
};

const resolvePosthogApiKey = (): string =>
  extra.posthogApiKey ?? process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '';

const resolvePosthogHost = (): string =>
  extra.posthogHost ?? process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sanitizeProperties = (properties?: Record<string, any>): Record<string, any> | undefined => {
  if (!properties) {
    return undefined;
  }

  const { email, ...rest } = properties;
  return rest;
};

/**
 * Initialize PostHog client
 * Call this once at app startup
 */
export const initAnalytics = async (): Promise<PostHog | null> => {
  const POSTHOG_API_KEY = resolvePosthogApiKey();
  const POSTHOG_HOST = resolvePosthogHost();

  if (!POSTHOG_API_KEY) {
    logger.debug('[Analytics] PostHog not configured (POSTHOG_API_KEY missing)');
    return null;
  }

  try {
    posthogClient = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
      // Enable debug mode in development
      enableSessionReplay: false, // Optional: enable session replay
    });
    logger.debug('[Analytics] PostHog initialized');
    return posthogClient;
  } catch (error) {
    logger.error('[Analytics] Failed to initialize PostHog:', error);
    return null;
  }
};

/**
 * Get PostHog client instance
 */
export const getAnalyticsClient = (): PostHog | null => {
  return posthogClient;
};

/**
 * Track an event
 */
export const trackEvent = (
  eventName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties?: Record<string, any>
): void => {
  if (!posthogClient) {
    return;
  }

  try {
    posthogClient.capture(eventName, sanitizeProperties(properties));
  } catch (error) {
    logger.error(`[Analytics] Failed to track event '${eventName}':`, error);
  }
};

/**
 * Identify a user
 */
export const identifyUser = async (
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties?: Record<string, any>
): Promise<void> => {
  if (!posthogClient) {
    return;
  }

  try {
    const distinctId = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      userId,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    posthogClient.identify(distinctId, sanitizeProperties(properties));
  } catch (error) {
    logger.error('[Analytics] Failed to identify user:', error);
  }
};

/**
 * Reset user identity (call on logout)
 */
export const resetAnalytics = (): void => {
  if (!posthogClient) {
    return;
  }

  try {
    posthogClient.reset();
  } catch (error) {
    logger.error('[Analytics] Failed to reset analytics:', error);
  }
};

/**
 * Standard event names
 */
export const EventNames = {
  // Content consumption
  THEME_VIEWED: 'theme_viewed',
  RANKING_VIEWED: 'ranking_viewed',
  MY_POEMS_VIEWED: 'my_poems_viewed',
  WORK_VIEWED: 'work_viewed',

  // Engagement
  WORK_LIKED: 'work_liked',
  SPONSOR_LINK_CLICKED: 'sponsor_link_clicked',

  // Content creation
  WORK_CREATED: 'work_created',

  // Navigation
  SCREEN_VIEWED: 'screen_viewed',
  CATEGORY_SELECTED: 'category_selected',

  // Authentication
  LOGIN_ATTEMPTED: 'login_attempted',
  SIGNUP_ATTEMPTED: 'signup_attempted',

  // Errors
  ERROR_OCCURRED: 'error_occurred',
} as const;
