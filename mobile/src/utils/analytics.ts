/**
 * Analytics Utility
 * PostHog integration for event tracking
 */

import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import PostHog from 'posthog-react-native';
import { logger } from './logger';
import { getSecureItem, setSecureItem } from './secureStorage';

let posthogClient: PostHog | null = null;

// Current user context for analytics
let currentUserEmail: string | null = null;
let currentUserOptOut = false;
let currentUserAuthenticated = false;
let identifiedUserId: string | null = null;
let activeEventPromise: Promise<void> | null = null;

const APP_ACTIVE_DATE_KEY_PREFIX = 'yomibiyori.analytics.appActiveDate';
const APP_ACTIVE_TIMEZONE = 'Asia/Tokyo';

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

interface AnalyticsUserContext {
  email: string | null;
  analyticsOptOut?: boolean;
  isAuthenticated?: boolean;
}

/**
 * Set current user context for analytics.
 * Call this after login/signup/session restore to keep tracking rules aligned with the profile.
 */
export const setAnalyticsUserContext = ({
  email,
  analyticsOptOut = false,
  isAuthenticated = false,
}: AnalyticsUserContext): void => {
  currentUserEmail = email;
  currentUserOptOut = analyticsOptOut;
  currentUserAuthenticated = isAuthenticated;

  if (!isAuthenticated || analyticsOptOut) {
    identifiedUserId = null;
  }

  logger.debug('[Analytics] User context set:', {
    emailDomain: email ? getEmailDomain(email) : 'null',
    analyticsOptOut,
    isAuthenticated,
  });
};

/**
 * Clear user context (call on logout)
 */
export const clearAnalyticsUserContext = (): void => {
  currentUserEmail = null;
  currentUserOptOut = false;
  currentUserAuthenticated = false;
  identifiedUserId = null;
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

  if (currentUserOptOut) {
    logger.debug('[Analytics] Skipping event for opted-out user:', eventName);
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

  if (currentUserOptOut) {
    logger.debug('[Analytics] Skipping identify for opted-out user');
    return;
  }

  try {
    const distinctId = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      userId,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    posthogClient.identify(distinctId, sanitizeProperties(properties));
    identifiedUserId = userId;
    await trackAuthenticatedAppActive();
  } catch (error) {
    identifiedUserId = null;
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

const canTrackComposeFunnelEvent = (): boolean => (
  !!posthogClient &&
  currentUserAuthenticated &&
  !currentUserOptOut &&
  !!identifiedUserId
);

const getCurrentJstDate = (): string => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_ACTIVE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(new Date());
};

export const trackAuthenticatedAppActive = async (): Promise<void> => {
  if (!canTrackComposeFunnelEvent() || !identifiedUserId) {
    return;
  }

  if (activeEventPromise) {
    await activeEventPromise;
    return;
  }

  activeEventPromise = (async () => {
    const activityDate = getCurrentJstDate();
    const storageKey = `${APP_ACTIVE_DATE_KEY_PREFIX}.${identifiedUserId}`;
    const lastTrackedDate = await getSecureItem(storageKey);

    if (lastTrackedDate === activityDate) {
      return;
    }

    trackEvent(EventNames.APP_ACTIVE_AUTHENTICATED, {
      activity_date: activityDate,
    });
    await setSecureItem(storageKey, activityDate);
  })();

  try {
    await activeEventPromise;
  } catch (error) {
    logger.error('[Analytics] Failed to track authenticated app active event:', error);
  } finally {
    activeEventPromise = null;
  }
};

export const trackComposeFunnelEvent = (
  eventName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties?: Record<string, any>
): void => {
  if (!canTrackComposeFunnelEvent()) {
    logger.debug('[Analytics] Skipping compose funnel event:', {
      eventName,
      hasClient: !!posthogClient,
      currentUserAuthenticated,
      currentUserOptOut,
      isIdentified: !!identifiedUserId,
    });
    return;
  }

  trackEvent(eventName, properties);
};

const _GENDER_MAP: Record<string, string> = { male: '男性', female: '女性', other: 'その他' };

/**
 * Build PostHog person properties from user profile fields
 */
export const buildPersonProperties = (profile: {
  display_name?: string | null;
  birth_year?: number | null;
  gender?: string | null;
  prefecture?: string | null;
}): Record<string, string | boolean | null> => {
  const currentYear = new Date().getFullYear();
  const props: Record<string, string | boolean | null> = {};
  if (profile.display_name) props.display_name = profile.display_name;
  if (profile.birth_year) props.age_group = `${Math.floor((currentYear - profile.birth_year) / 10) * 10}代`;
  if (profile.gender) props.gender = _GENDER_MAP[profile.gender] ?? profile.gender;
  if (profile.prefecture) props.prefecture = profile.prefecture;
  return props;
};

/**
 * Standard event names
 */
export const EventNames = {
  // Content consumption
  THEME_VIEWED: 'theme_viewed',
  COMPOSE_ENTRY_VIEWED: 'compose_entry_viewed',
  COMPOSE_THEME_VIEWED: 'compose_theme_viewed',
  RANKING_VIEWED: 'ranking_viewed',
  MY_POEMS_VIEWED: 'my_poems_viewed',
  WORK_VIEWED: 'work_viewed',

  // Engagement
  WORK_LIKED: 'work_liked',
  SPONSOR_LINK_CLICKED: 'sponsor_link_clicked',

  // Content creation
  WORK_CREATED: 'work_created',
  WORK_CREATE_SUCCEEDED_UI: 'work_create_succeeded_ui',

  // Navigation
  SCREEN_VIEWED: 'screen_viewed',
  CATEGORY_SELECTED: 'category_selected',

  // Authentication
  LOGIN_ATTEMPTED: 'login_attempted',
  SIGNUP_ATTEMPTED: 'signup_attempted',
  APP_ACTIVE_AUTHENTICATED: 'app_active_authenticated',

  // Errors
  ERROR_OCCURRED: 'error_occurred',
} as const;
