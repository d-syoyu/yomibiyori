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

export interface UserProfile {
  user_id: string;
  email: string;
  display_name?: string;
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
  created_at: string; // ISO 8601 datetime
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
}

// API returns an array of works directly, not wrapped in an object
export type WorkListResponse = Work[];

export interface WorkLikeResponse {
  status: 'liked';
  likes_count: number;
}

// ============================================================================
// Resonance (共鳴) Types
// ============================================================================

export interface CreateResonanceRequest {
  work_id: string;
}

export interface Resonance {
  id: string;
  work_id: string;
  user_id: string;
  created_at: string;
}

// ============================================================================
// Ranking Types
// ============================================================================

export interface RankingEntry {
  rank: number;
  work_id: string;
  score: number;
  user_name: string;
  text: string;
}

// API returns an array of ranking entries directly
export type RankingResponse = RankingEntry[];

// ============================================================================
// Navigation Types
// ============================================================================

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
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

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiError {
  detail: string;
  status?: number;
}

export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}
