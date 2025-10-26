/**
 * Ranking Screen
 * ランキング画面 - お題ごとのランキング表示
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../services/api';
import type { ThemeCategory, RankingEntry, Theme } from '../types';
import VerticalText from '../components/VerticalText';
import { useThemeStore } from '../stores/useThemeStore';
import { colors, spacing, borderRadius, shadow, fontSize, fontFamily } from '../theme';

const CATEGORIES: ThemeCategory[] = ['恋愛', '季節', '日常', 'ユーモア'];

const CATEGORY_ICONS: Record<ThemeCategory, string> = {
  '恋愛': '💕',
  '季節': '🌸',
  '日常': '☕',
  'ユーモア': '😄',
};

export default function RankingScreen() {
  const getTodayTheme = useThemeStore(state => state.getTodayTheme);

  const [selectedCategory, setSelectedCategory] = useState<ThemeCategory>('恋愛');
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [theme, setTheme] = useState<Theme | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFinalized, setIsFinalized] = useState(false);

  const fetchRankings = async (category: ThemeCategory) => {
    try {
      setLoading(true);
      setError(null);

      // Get today's theme for the category (using cached store with built-in fallback)
      // This should be instant if already cached
      const themeData = await getTodayTheme(category);

      // Display theme immediately
      setTheme(themeData);

      // Check if ranking is finalized (theme date is before today)
      const themeDate = new Date(themeData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      themeDate.setHours(0, 0, 0, 0);
      const isRankingFinalized = themeDate < today;
      setIsFinalized(isRankingFinalized);

      // Now fetch rankings (this might take time)
      const rankingData = await api.getRanking(themeData.id);
      setRankings(rankingData);
    } catch (err: any) {
      console.error('Failed to fetch rankings:', err);

      // Provide user-friendly error messages
      let errorMessage = 'ランキングの取得に失敗しました';
      if (err?.status === 404 || err?.detail?.includes('not found')) {
        errorMessage = 'まだランキングが作成されていません\n22:00以降に確定されます';
      } else if (err?.detail === 'Ranking not available') {
        errorMessage = 'まだランキングが作成されていません\n22:00以降に確定されます';
      } else if (err?.status === 0) {
        errorMessage = 'ネットワークに接続できません\n接続を確認してください';
      } else if (err?.message?.includes('No themes found')) {
        errorMessage = 'このカテゴリのお題がまだありません';
      }

      setError(errorMessage);
      setRankings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Pre-fetch all category themes on mount for instant category switching
  useEffect(() => {
    const prefetchAllThemes = async () => {
      console.log('[RankingScreen] Pre-fetching all category themes');
      await Promise.all(
        CATEGORIES.map(category => getTodayTheme(category))
      );
      console.log('[RankingScreen] All themes cached');
    };

    prefetchAllThemes();
  }, []); // Run only once on mount

  useEffect(() => {
    fetchRankings(selectedCategory);
  }, [selectedCategory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRankings(selectedCategory);
  };

  const handleCategoryChange = (category: ThemeCategory) => {
    setSelectedCategory(category);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Fixed Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>ランキング</Text>
            {theme && (
              <View style={[
                styles.statusBadge,
                isFinalized ? styles.statusBadgeFinalized : styles.statusBadgeTemporary
              ]}>
                <Text style={[
                  styles.statusBadgeText,
                  isFinalized ? styles.statusBadgeTextFinalized : styles.statusBadgeTextTemporary
                ]}>
                  {isFinalized ? '確定' : '仮'}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.subtitle}>
            {isFinalized ? '確定したランキング' : 'リアルタイム集計中（22:00確定）'}
          </Text>

          {/* Category Selector */}
          <View style={styles.categorySelector}>
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  selectedCategory === category && styles.categoryButtonActive,
                ]}
                onPress={() => handleCategoryChange(category)}
                activeOpacity={0.8}
              >
                <Text style={styles.categoryIcon}>{CATEGORY_ICONS[category]}</Text>
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === category && styles.categoryTextActive,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Theme Display */}
          {theme && (
            <LinearGradient
              colors={[
                colors.category[theme.category].gradient[0],
                colors.category[theme.category].gradient[1],
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.themeCard,
                { shadowColor: colors.category[theme.category].shadow },
              ]}
            >
              <View style={styles.glassOverlay}>
                <Text style={styles.themeLabel}>今日のお題（上の句）</Text>
                <View style={styles.verticalTextContainer}>
                  <VerticalText
                    text={theme.text}
                    textStyle={styles.themeVerticalText}
                    direction="rtl"
                  />
                </View>
              </View>
            </LinearGradient>
          )}
        </View>

        {/* Scrollable Ranking List */}
        <ScrollView
          style={styles.rankingScrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A5568" />
            <Text style={styles.loadingText}>読み込み中...</Text>
          </View>
        )}

        {/* Error State */}
        {error && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => fetchRankings(selectedCategory)}
            >
              <Text style={styles.retryButtonText}>再試行</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty State */}
        {!loading && !error && rankings.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>ランキングデータがありません</Text>
            <Text style={styles.emptyStateSubtext}>
              作品が投稿されるとランキングが表示されます
            </Text>
          </View>
        )}

        {/* Ranking List */}
        {!loading && rankings.length > 0 && (
          <View style={styles.rankingList}>
            {rankings.map((entry) => (
              <View key={entry.work_id} style={styles.rankingCard}>
                <View
                  style={[
                    styles.rankBadge,
                    entry.rank === 1 && styles.rankBadgeGold,
                    entry.rank === 2 && styles.rankBadgeSilver,
                    entry.rank === 3 && styles.rankBadgeBronze,
                  ]}
                >
                  <Text style={styles.rankText}>{entry.rank}</Text>
                </View>
                <View style={styles.workInfo}>
                  <View style={styles.workVerticalContainer}>
                    <VerticalText
                      text={entry.text}
                      textStyle={styles.workVerticalText}
                      direction="ltr"
                    />
                  </View>
                  <Text style={styles.workAuthor}>by {entry.display_name}</Text>
                </View>
                <Text style={styles.scoreText}>
                  {(entry.score * 100).toFixed(1)}%
                </Text>
              </View>
            ))}
          </View>
        )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.h1,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    letterSpacing: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  statusBadgeFinalized: {
    backgroundColor: colors.status.success,
  },
  statusBadgeTemporary: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.text.tertiary,
  },
  statusBadgeText: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.semiBold,
    letterSpacing: 0.5,
  },
  statusBadgeTextFinalized: {
    color: colors.text.inverse,
  },
  statusBadgeTextTemporary: {
    color: colors.text.secondary,
  },
  subtitle: {
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.regular,
    color: colors.text.tertiary,
    marginBottom: spacing.md,
    letterSpacing: 0.5,
  },
  rankingScrollView: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  categorySelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  categoryButton: {
    flex: 1,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadow.sm,
  },
  categoryButtonActive: {
    borderColor: colors.text.primary,
    backgroundColor: colors.background.secondary,
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.medium,
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  categoryTextActive: {
    color: colors.text.primary,
    fontFamily: fontFamily.semiBold,
  },
  themeCard: {
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
    ...shadow.lg,
    overflow: 'hidden',
  },
  glassOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: spacing.md,
  },
  themeLabel: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.medium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    letterSpacing: 1,
    textAlign: 'center',
  },
  verticalTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    marginVertical: spacing.sm,
  },
  themeVerticalText: {
    fontSize: fontSize.poem,
    lineHeight: 34,
    color: colors.text.primary,
    fontFamily: fontFamily.medium,
  },
  loadingContainer: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    ...shadow.sm,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.regular,
    color: colors.text.tertiary,
  },
  emptyState: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    ...shadow.sm,
  },
  emptyStateText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.medium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  emptyStateSubtext: {
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.regular,
    color: colors.text.tertiary,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  retryButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.text.primary,
    borderRadius: borderRadius.md,
    ...shadow.sm,
  },
  retryButtonText: {
    color: colors.text.inverse,
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.semiBold,
    letterSpacing: 0.5,
  },
  rankingList: {
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  rankingCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    ...shadow.md,
  },
  rankBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.text.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  rankBadgeGold: {
    backgroundColor: colors.status.warning,
  },
  rankBadgeSilver: {
    backgroundColor: colors.text.tertiary,
  },
  rankBadgeBronze: {
    backgroundColor: colors.status.error,
  },
  rankText: {
    fontSize: fontSize.h4,
    fontFamily: fontFamily.semiBold,
    color: colors.text.inverse,
  },
  workInfo: {
    flex: 1,
    alignItems: 'center',
  },
  workVerticalContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
    marginBottom: spacing.sm,
  },
  workVerticalText: {
    fontSize: fontSize.body,
    lineHeight: 28,
    color: colors.text.primary,
    fontFamily: fontFamily.regular,
  },
  workAuthor: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.regular,
    color: colors.text.tertiary,
    letterSpacing: 0.3,
  },
  scoreText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    color: colors.text.secondary,
  },
});
