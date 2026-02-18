/**
 * Type definitions for Yomibiyori API
 * Based on OPENAPI.yaml specification
 */

// ============================================================================
// Auth Types
// ============================================================================

export interface SignUpRequest {
  email: string;
  password: string;
  display_name: string;
}

export interface SessionToken {
  access_token: string;
  refresh_token?: string;
  token_type: 'bearer';
  expires_in?: number;
}

export interface SignUpResponse {
  user_id: string;
  email: string;
  display_name?: string;
  session?: SessionToken;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user_id: string;
  email: string;
  display_name?: string;
  session?: SessionToken;
}

export interface DeviceInfo {
  platform: string;
  os_version?: string;
  timezone?: string;
  locale?: string;
}

export type GenderType = 'male' | 'female' | 'other';

export interface UserProfile {
  user_id: string;
  email: string;
  display_name?: string;
  birth_year?: number;
  gender?: GenderType;
  prefecture?: string;
  device_info?: DeviceInfo;
  analytics_opt_out: boolean;
  notify_theme_release: boolean;
  notify_ranking_result: boolean;
  profile_image_url?: string;
}

export interface UpdateProfileRequest {
  display_name?: string;
  birth_year?: number;
  gender?: GenderType;
  prefecture?: string;
  device_info?: DeviceInfo;
  analytics_opt_out?: boolean;
  notify_theme_release?: boolean;
  notify_ranking_result?: boolean;
}

export interface NotificationTokenRequest {
  expo_push_token: string;
  device_id?: string;
  platform?: string;
  app_version?: string;
}

export interface NotificationTokenResponse {
  id: string;
  expo_push_token: string;
  device_id?: string | null;
  platform?: string | null;
  app_version?: string | null;
  is_active: boolean;
  last_registered_at: string;
}

export interface OAuthUrlResponse {
  url: string;
  provider: 'google' | 'apple';
}

export interface OAuthCallbackRequest {
  access_token: string;
  refresh_token?: string;
}

export interface OAuthCallbackResponse {
  user_id: string;
  email: string;
  display_name?: string;
  session?: SessionToken;
}

// ============================================================================
// Theme Types
// ============================================================================

export type ThemeCategory = '恋愛' | '季節' | '日常' | 'ユーモア';

export interface Theme {
  id: string;
  text: string;
  category: ThemeCategory;
  date: string; // ISO 8601 date (YYYY-MM-DD)
  sponsored: boolean;
  sponsor_company_name?: string; // Sponsor company name (e.g., '提供：企業名')
  sponsor_official_url?: string;
  created_at: string; // ISO 8601 datetime
  is_finalized: boolean; // Whether ranking is finalized (after 22:00 JST)
}

export interface ThemeListResponse {
  themes: Theme[];
  count: number;
}

// ============================================================================
// Work (詠み) Types
// ============================================================================

export interface CreateWorkRequest {
  theme_id: string;
  text: string;
}

export interface Work {
  id: string;
  theme_id: string;
  user_id: string;
  text: string;
  created_at: string;
  likes_count: number;
  display_name: string;
  profile_image_url?: string;
}

// API returns an array of works directly, not wrapped in an object
export type WorkListResponse = Work[];

export interface WorkLikeResponse {
  status: 'liked' | 'unliked';
  likes_count: number;
}

export interface WorkLikeStatusResponse {
  liked: boolean;
  likes_count: number;
}

export interface WorkLikeBatchRequest {
  work_ids: string[];
}

export interface WorkLikeBatchStatusItem {
  work_id: string;
  liked: boolean;
  likes_count: number;
}

export interface WorkLikeBatchResponse {
  items: WorkLikeBatchStatusItem[];
}

export interface WorkDateSummary {
  date: string; // ISO 8601 date (YYYY-MM-DD)
  works_count: number;
  total_likes: number;
}

export interface WorkImpressionResponse {
  status: 'recorded';
  impressions_count: number;
  unique_viewers_count: number;
}

// Ranking Types
// ============================================================================

export interface RankingEntry {
  rank: number;
  work_id: string;
  user_id: string;
  score: number;
  display_name: string;
  text: string;
  profile_image_url?: string;
}

// API returns an array of ranking entries directly
export type RankingResponse = RankingEntry[];

// ============================================================================
// Public User Profile Types
// ============================================================================

export interface PublicUserProfile {
  user_id: string;
  display_name: string;
  profile_image_url?: string;
  works_count: number;
  total_likes: number;
}

// ============================================================================
// Navigation Types
// ============================================================================

export type RootStackParamList = {
  Login: undefined;
  PasswordReset: undefined;
  Main: undefined;
  UserProfile: { userId: string; displayName: string };
};

export type MainTabParamList = {
  Home: undefined;
  Ranking: undefined;
  MyPoems: undefined;
};

export type HomeStackParamList = {
  CategorySelection: undefined;
  ActionSelection: { category: ThemeCategory };
  Composition: { theme: Theme };
  Appreciation: { category: ThemeCategory };
};

export type MyPoemsStackParamList = {
  MyPoemsList: undefined;
  ProfileSetup: undefined;
  Profile: undefined;
};

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiError {
  detail: string;
  status?: number;
  error?: {
    detail: string;
  };
}

export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}
