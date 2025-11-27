/**
 * Ranking Screen
 * ランキング画面 - お題ごとのランキング表示
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api';
import type { ThemeCategory, RankingEntry, Theme } from '../types';
import type { SharePayload } from '../types/share';
import { Ionicons } from '@expo/vector-icons';
import CategoryIcon from '../components/CategoryIcon';
import WorkCard from '../components/WorkCard';
import ShareSheet from '../components/ShareSheet';
import { useThemeStore } from '../stores/useThemeStore';
import { useApiErrorHandler } from '../hooks/useApiErrorHandler';
import { colors, spacing, borderRadius, shadow, fontSize, fontFamily } from '../theme';
import { trackEvent, EventNames } from '../utils/analytics';
import { createRankingSharePayload } from '../utils/share';

const CATEGORIES: ThemeCategory[] = ['恋愛', '季節', '日常', 'ユーモア'];

export default function RankingScreen() {
  const getTodayTheme = useThemeStore(state => state.getTodayTheme);
  const { handleError } = useApiErrorHandler();

  const [selectedCategory, setSelectedCategory] = useState<ThemeCategory>('恋愛');
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [theme, setTheme] = useState<Theme | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFinalized, setIsFinalized] = useState(false);
  const [sharePayload, setSharePayload] = useState<SharePayload | null>(null);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      trackEvent(EventNames.SCREEN_VIEWED, {
        screen_name: 'Ranking',
        category: selectedCategory,
      });
    }, [selectedCategory])
  );

  const fetchRankings = async (category: ThemeCategory) => {
    try {
      setLoading(true);
      setError(null);

      // Get today's theme for the category (using cached store with built-in fallback)
      // This should be instant if already cached
      const themeData = await getTodayTheme(category);

      // Display theme immediately
      setTheme(themeData);

      // Use server-side finalization status (reliable, not affected by device timezone)
      setIsFinalized(themeData.is_finalized);

      // Now fetch rankings (this might take time)
      const rankingData = await api.getRanking(themeData.id);
      setRankings(rankingData);

      // Track ranking viewed event
      trackEvent(EventNames.RANKING_VIEWED, {
        theme_id: themeData.id,
        category: category,
        is_finalized: themeData.is_finalized,
        entries_count: rankingData.length,
      });
    } catch (err: any) {
      handleError(err, 'ranking_fetching');
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

  const handleShareRanking = useCallback((entry: RankingEntry) => {
    if (!theme) {
      return;
    }
    const payload = createRankingSharePayload(entry, theme);
    setSharePayload(payload);
    setShareSheetVisible(true);
  }, [theme]);

  const closeShareSheet = useCallback(() => {
    setShareSheetVisible(false);
    setSharePayload(null);
  }, []);

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
            {CATEGORIES.map((category) => {
              const categoryColors = colors.category[category];
              const isSelected = selectedCategory === category;
              return (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    isSelected && {
                      borderColor: categoryColors.primary,
                      backgroundColor: categoryColors.gradient[1],
                    },
                  ]}
                  onPress={() => handleCategoryChange(category)}
                  activeOpacity={0.8}
                >
                  <CategoryIcon
                    category={category}
                    size={24}
                    color={isSelected ? colors.text.primary : colors.text.secondary}
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      isSelected && styles.categoryTextActive,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Theme display removed to align with combined cards */}
        </View>

        {/* 仮想化されたランキングリスト */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A5568" />
            <Text style={styles.loadingText}>読み込み中...</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => fetchRankings(selectedCategory)}
            >
              <Text style={styles.retryButtonText}>再試行</Text>
            </TouchableOpacity>
          </View>
        ) : rankings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>ランキングデータがありません</Text>
            <Text style={styles.emptyStateSubtext}>
              作品が投稿されるとランキングが表示されます
            </Text>
          </View>
        ) : (
          <FlatList
            data={rankings}
            keyExtractor={(item) => item.work_id}
            renderItem={({ item: entry }) => (
              <View style={styles.rankingCard}>
                <WorkCard
                  upperText={theme?.text}
                  lowerText={entry.text}
                  category={theme?.category ?? '恋愛'}
                  displayName={entry.display_name}
                  sponsorName={theme?.sponsored ? theme.sponsor_company_name : undefined}
                  sponsorUrl={theme?.sponsor_official_url}
                  onSponsorPress={() => {
                    if (!theme?.sponsor_company_name || !theme?.sponsor_official_url) {
                      return;
                    }
                    trackEvent(EventNames.SPONSOR_LINK_CLICKED, {
                      theme_id: theme.id,
                      sponsor_name: theme.sponsor_company_name,
                      url: theme.sponsor_official_url,
                      context: 'ranking',
                    });
                    Linking.openURL(theme.sponsor_official_url);
                  }}
                  badgeLabel={`${entry.rank}位`}
                  customActions={
                    <View style={styles.rankActions}>
                      <Text style={styles.scoreText}>
                        {(entry.score * 100).toFixed(1)}%
                      </Text>
                      <TouchableOpacity
                        style={styles.shareButton}
                        onPress={() => handleShareRanking(entry)}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="ランキングを共有"
                      >
                        <Ionicons name="share-outline" size={18} color={colors.text.secondary} />
                      </TouchableOpacity>
                    </View>
                  }
                />
              </View>
            )}
            contentContainerStyle={styles.rankingList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            // パフォーマンス最適化オプション
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            windowSize={5}
            removeClippedSubviews={true}
            updateCellsBatchingPeriod={50}
          />
        )}

        <ShareSheet
          visible={shareSheetVisible}
          payload={sharePayload}
          onClose={closeShareSheet}
        />
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
  categoryText: {
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.medium,
    color: colors.text.primary,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  categoryTextActive: {
    color: colors.text.primary,
    fontFamily: fontFamily.semiBold,
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
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  rankingCard: {
    marginBottom: spacing.sm,
  },
  rankInfo: {
    minWidth: 70,
    alignItems: 'flex-end',
    gap: 4,
    marginRight: spacing.sm,
  },
  rankActions: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  rankBadgeText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
  },
  scoreText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    color: colors.text.secondary,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(26, 54, 93, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
