/**
 * Analytics Utility
 * PostHog integration for event tracking
 */

import PostHog from 'posthog-react-native';

let posthogClient: PostHog | null = null;

/**
 * Initialize PostHog client
 * Call this once at app startup
 */
export const initAnalytics = async (): Promise<PostHog | null> => {
  // TODO: Replace with your actual PostHog API key and host
  const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY || '';
  const POSTHOG_HOST = process.env.POSTHOG_HOST || 'https://app.posthog.com';

  if (!POSTHOG_API_KEY) {
    console.log('[Analytics] PostHog not configured (POSTHOG_API_KEY missing)');
    return null;
  }

  try {
    posthogClient = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
      // Enable debug mode in development
      enableSessionReplay: false, // Optional: enable session replay
    });
    console.log('[Analytics] PostHog initialized');
    return posthogClient;
  } catch (error) {
    console.error('[Analytics] Failed to initialize PostHog:', error);
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
  properties?: Record<string, any>
): void => {
  if (!posthogClient) {
    return;
  }

  try {
    posthogClient.capture(eventName, properties);
  } catch (error) {
    console.error(`[Analytics] Failed to track event '${eventName}':`, error);
  }
};

/**
 * Identify a user
 */
export const identifyUser = (
  userId: string,
  properties?: Record<string, any>
): void => {
  if (!posthogClient) {
    return;
  }

  try {
    posthogClient.identify(userId, properties);
  } catch (error) {
    console.error(`[Analytics] Failed to identify user '${userId}':`, error);
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
    console.error('[Analytics] Failed to reset analytics:', error);
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
