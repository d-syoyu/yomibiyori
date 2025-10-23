/**
 * Theme Cache Store
 * テーマをキャッシュして、不要なAPIリクエストを削減
 */

import { create } from 'zustand';
import type { Theme, ThemeCategory } from '../types';
import { api } from '../services/api';

interface ThemeStore {
  // カテゴリごとのテーマキャッシュ
  themesByCategory: Partial<Record<ThemeCategory, Theme>>;
  // テーマIDでのキャッシュ
  themesById: Record<string, Theme>;
  // キャッシュの日付（日が変わったらクリア）
  cacheDate: string | null;
  // ローディング状態
  loading: Record<string, boolean>;

  // アクション
  getTodayTheme: (category: ThemeCategory) => Promise<Theme>;
  getThemeById: (id: string) => Promise<Theme>;
  clearCache: () => void;
  checkAndClearOldCache: () => void;
}

/**
 * Get the current "theme day" identifier
 * Theme day changes at 6:00 JST, not at midnight
 * Example: 2025-10-24 05:59 JST -> returns "2025-10-23"
 *          2025-10-24 06:00 JST -> returns "2025-10-24"
 */
const getThemeDayString = (): string => {
  const now = new Date();
  const jstOffset = 9 * 60; // JST is UTC+9
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const jstTime = new Date(utcTime + (jstOffset * 60000));

  // If before 6:00 JST, use previous day's theme
  const jstHour = jstTime.getHours();
  if (jstHour < 6) {
    jstTime.setDate(jstTime.getDate() - 1);
  }

  return jstTime.toISOString().split('T')[0]; // YYYY-MM-DD
};

export const useThemeStore = create<ThemeStore>((set, get) => ({
  themesByCategory: {},
  themesById: {},
  cacheDate: null,
  loading: {},

  /**
   * テーマの日付をチェックし、6:00 JSTを境に古いキャッシュをクリア
   * 例: 10/24 05:59 JST -> 10/23のテーマ (キャッシュ保持)
   *     10/24 06:00 JST -> 10/24のテーマ (キャッシュクリア)
   */
  checkAndClearOldCache: () => {
    const currentThemeDay = getThemeDayString();
    const { cacheDate } = get();

    if (cacheDate && cacheDate !== currentThemeDay) {
      console.log('[ThemeStore] Theme day changed (6:00 JST boundary), clearing cache');
      console.log(`[ThemeStore] Previous theme day: ${cacheDate}, Current: ${currentThemeDay}`);
      set({
        themesByCategory: {},
        cacheDate: currentThemeDay,
      });
    } else if (!cacheDate) {
      set({ cacheDate: currentThemeDay });
    }
  },

  /**
   * カテゴリの今日のテーマを取得（キャッシュ優先）
   */
  getTodayTheme: async (category: ThemeCategory): Promise<Theme> => {
    const state = get();

    // 日付チェック
    state.checkAndClearOldCache();

    // キャッシュチェック
    const cached = state.themesByCategory[category];
    if (cached) {
      console.log(`[ThemeStore] Using cached theme for category: ${category}`);
      return cached;
    }

    // ローディングチェック（重複リクエスト防止）
    const loadingKey = `category_${category}`;
    if (state.loading[loadingKey]) {
      console.log(`[ThemeStore] Already loading theme for category: ${category}`);
      // 少し待ってから再チェック
      await new Promise(resolve => setTimeout(resolve, 100));
      return state.getTodayTheme(category);
    }

    // APIから取得
    console.log(`[ThemeStore] Fetching theme for category: ${category}`);
    set(state => ({
      loading: { ...state.loading, [loadingKey]: true }
    }));

    try {
      let theme: Theme;

      try {
        // まず今日のテーマを取得
        theme = await api.getTodayTheme(category);
        console.log(`[ThemeStore] Got today's theme for ${category}`);
      } catch (err: any) {
        // 今日のテーマがない場合、最新のテーマを取得（フォールバック）
        if (err?.status === 404) {
          console.log(`[ThemeStore] Today's theme not found, fetching latest for ${category}`);
          const response = await api.getThemes({ category, limit: 1 });
          if (response.themes && response.themes.length > 0) {
            theme = response.themes[0];
            console.log(`[ThemeStore] Got latest theme for ${category}:`, theme.date);
          } else {
            throw new Error(`No themes found for category: ${category}`);
          }
        } else {
          throw err;
        }
      }

      // キャッシュに保存
      set(state => ({
        themesByCategory: {
          ...state.themesByCategory,
          [category]: theme,
        },
        themesById: {
          ...state.themesById,
          [theme.id]: theme,
        },
        loading: { ...state.loading, [loadingKey]: false }
      }));

      return theme;
    } catch (error) {
      set(state => ({
        loading: { ...state.loading, [loadingKey]: false }
      }));
      throw error;
    }
  },

  /**
   * テーマIDでテーマを取得（キャッシュ優先）
   */
  getThemeById: async (id: string): Promise<Theme> => {
    const state = get();

    // キャッシュチェック
    const cached = state.themesById[id];
    if (cached) {
      console.log(`[ThemeStore] Using cached theme for ID: ${id}`);
      return cached;
    }

    // ローディングチェック（重複リクエスト防止）
    const loadingKey = `id_${id}`;
    if (state.loading[loadingKey]) {
      console.log(`[ThemeStore] Already loading theme ID: ${id}`);
      await new Promise(resolve => setTimeout(resolve, 100));
      return state.getThemeById(id);
    }

    // APIから取得
    console.log(`[ThemeStore] Fetching theme by ID: ${id}`);
    set(state => ({
      loading: { ...state.loading, [loadingKey]: true }
    }));

    try {
      const theme = await api.getThemeById(id);

      // キャッシュに保存
      set(state => ({
        themesById: {
          ...state.themesById,
          [id]: theme,
        },
        loading: { ...state.loading, [loadingKey]: false }
      }));

      return theme;
    } catch (error) {
      set(state => ({
        loading: { ...state.loading, [loadingKey]: false }
      }));
      throw error;
    }
  },

  /**
   * キャッシュをクリア
   */
  clearCache: () => {
    console.log('[ThemeStore] Clearing all cache');
    set({
      themesByCategory: {},
      themesById: {},
      cacheDate: getThemeDayString(),
    });
  },
}));
