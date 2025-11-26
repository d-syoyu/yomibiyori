/**
 * Analytics Utility
 * PostHog integration for event tracking
 */

import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import PostHog from 'posthog-react-native';
import { logger } from './logger';

let posthogClient: PostHog | null = null;

// Current user context for analytics
let currentUserEmail: string | null = null;

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

/**
 * Check if email belongs to a sample account
 */
const isSampleAccount = (email: string | null): boolean => {
  if (!email) return false;
  return email.endsWith('@yomibiyori.app');
};

/**
 * Extract domain from email address
 */
const getEmailDomain = (email: string | null): string | null => {
  if (!email || !email.includes('@')) return null;
  return email.split('@').pop()?.toLowerCase() ?? null;
};

/**
 * Set current user context for analytics
 * Call this after login/signup to enable automatic sample account detection
 */
export const setAnalyticsUserContext = (email: string | null): void => {
  currentUserEmail = email;
  logger.debug('[Analytics] User context set:', email ? getEmailDomain(email) : 'null');
};

/**
 * Clear user context (call on logout)
 */
export const clearAnalyticsUserContext = (): void => {
  currentUserEmail = null;
  logger.debug('[Analytics] User context cleared');
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sanitizeProperties = (properties?: Record<string, any>): Record<string, any> | undefined => {
  if (!properties) {
    return undefined;
  }

  const { email, ...rest } = properties;
  return rest;
};

/**
 * Enrich properties with sample account info
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const enrichWithUserContext = (properties?: Record<string, any>): Record<string, any> => {
  const enriched = { ...properties };

  if (currentUserEmail) {
    enriched.is_sample_account = isSampleAccount(currentUserEmail);
    enriched.email_domain = getEmailDomain(currentUserEmail);
  }

  return enriched;
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
 * Automatically adds is_sample_account and email_domain if user context is set
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
    const enrichedProps = enrichWithUserContext(properties);
    posthogClient.capture(eventName, sanitizeProperties(enrichedProps));
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
  // Clear user context
  clearAnalyticsUserContext();

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
