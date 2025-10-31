/**
 * Appreciation Screen
 * 鑑賞画面 - 他のユーザーの作品を鑑賞する
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList, ThemeCategory, Work, Theme } from '../types';
import api from '../services/api';
import VerticalText from '../components/VerticalText';
import CategoryIcon from '../components/CategoryIcon';
import { useThemeStore } from '../stores/useThemeStore';
import { useToastStore } from '../stores/useToastStore';
import { useApiErrorHandler } from '../hooks/useApiErrorHandler';
import { colors, spacing, borderRadius, shadow, fontSize, fontFamily } from '../theme';
import { trackEvent, EventNames } from '../utils/analytics';

type Props = NativeStackScreenProps<HomeStackParamList, 'Appreciation'>;

const CATEGORIES: ThemeCategory[] = ['恋愛', '季節', '日常', 'ユーモア'];

export default function AppreciationScreen({ route }: Props) {
  const getTodayTheme = useThemeStore(state => state.getTodayTheme);
  const { handleError } = useApiErrorHandler();

  const [selectedCategory, setSelectedCategory] = useState<ThemeCategory>(
    route.params?.category || '恋愛'
  );
  const [works, setWorks] = useState<Work[]>([]);
  const [themesMap, setThemesMap] = useState<Map<string, Theme>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentThemeId, setCurrentThemeId] = useState<string | null>(null);

  // Load works for the selected category
  const loadWorks = useCallback(async (isRefresh = false) => {
    console.log('[AppreciationScreen] Loading works for category:', selectedCategory);
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const newThemesMap = new Map<string, Theme>();

      // Get theme and works for selected category (using cached store)
      console.log('[AppreciationScreen] Fetching theme for category:', selectedCategory);
      const theme = await getTodayTheme(selectedCategory);
      console.log('[AppreciationScreen] Theme received:', theme);
      setCurrentThemeId(theme.id);
      newThemesMap.set(theme.id, theme);

      // Track theme viewed event
      trackEvent(EventNames.THEME_VIEWED, {
        theme_id: theme.id,
        category: theme.category,
      });

      console.log('[AppreciationScreen] Fetching works for theme:', theme.id);
      const worksData = await api.getWorksByTheme(theme.id, { limit: 50, order_by: 'fair_score' });
      console.log('[AppreciationScreen] Works received:', worksData.length, 'works');
      setWorks(worksData);

      setThemesMap(newThemesMap);
    } catch (error: any) {
      handleError(error, 'work_fetching');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedCategory, getTodayTheme, handleError]);

  // Load works when category changes
  useEffect(() => {
    loadWorks();
  }, [loadWorks]);

  // Handle like action
  const handleLike = async (workId: string) => {
    try {
      const response = await api.likeWork(workId);

      // Update the likes count in the local state (visual feedback only)
      setWorks(prevWorks =>
        prevWorks.map(work =>
          work.id === workId
            ? { ...work, likes_count: response.likes_count }
            : work
        )
      );

      // Track like event
      trackEvent(EventNames.WORK_LIKED, {
        work_id: workId,
        theme_id: currentThemeId,
        category: selectedCategory,
      });

      // No toast or haptic - just visual feedback with updated count
    } catch (error: any) {
      handleError(error, 'like_action');
    }
  };

  const handleRefresh = () => {
    loadWorks(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* ヘッダーとカテゴリフィルター */}
        <View style={styles.header}>
          <Text style={styles.title}>鑑賞</Text>

          <View style={styles.categorySelector}>
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  selectedCategory === category && styles.categoryButtonActive,
                ]}
                onPress={() => setSelectedCategory(category)}
                activeOpacity={0.8}
              >
                <CategoryIcon
                  category={category}
                  size={24}
                  color={selectedCategory === category ? colors.text.primary : colors.text.secondary}
                />
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

          {/* お題カード（固定） */}
          {currentThemeId && themesMap.has(currentThemeId) && (() => {
            const theme = themesMap.get(currentThemeId)!;
            return (
              <LinearGradient
                colors={[
                  colors.category[theme.category].gradient[0],
                  colors.category[theme.category].gradient[1],
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.fixedThemeCard,
                  { shadowColor: colors.category[theme.category].shadow },
                ]}
              >
                <View style={styles.glassOverlay}>
                  {theme.sponsored && theme.sponsor_company_name && (
                    <View style={styles.sponsorBadge}>
                      <Text style={styles.sponsorBadgeText}>
                        スポンサー提供
                      </Text>
                    </View>
                  )}
                  <Text style={styles.themeCardLabel}>今日のお題（上の句）</Text>
                  <View style={styles.verticalTextContainer}>
                    <VerticalText
                      text={theme.text}
                      textStyle={styles.themeCardText}
                      direction="rtl"
                    />
                  </View>
                  {theme.sponsored && theme.sponsor_company_name && (
                    <Text style={styles.sponsorInfo}>
                      {theme.sponsor_company_name}
                    </Text>
                  )}
                </View>
              </LinearGradient>
            );
          })()}
        </View>

        {/* 作品リスト（スクロール可能） */}
        <ScrollView
          style={styles.worksScrollView}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
        >
          <View style={styles.worksSection}>
          <Text style={styles.sectionTitle}>
            {selectedCategory}の作品
          </Text>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A5568" />
              <Text style={styles.loadingText}>作品を読み込み中...</Text>
            </View>
          ) : works.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>作品がありません</Text>
              <Text style={styles.emptyStateSubtext}>
                まだ誰も作品を投稿していません
              </Text>
            </View>
          ) : (
            <View style={styles.worksList}>
              {works.map((work) => (
                  <View key={work.id} style={styles.workCard}>
                    {/* 作品（下の句）縦書き表示 */}
                    <View style={styles.workSection}>
                      <View style={styles.verticalTextContainer}>
                        <VerticalText
                          text={work.text}
                          textStyle={styles.workVerticalText}
                          direction="ltr"
                        />
                      </View>
                    </View>

                    {/* フッター */}
                    <View style={styles.workFooter}>
                      <View style={styles.workMetaContainer}>
                        <Text style={styles.workAuthor}>by {work.display_name}</Text>
                        <Text style={styles.workMeta}>
                          {new Date(work.created_at).toLocaleTimeString('ja-JP', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.likeButton}
                        onPress={() => handleLike(work.id)}
                      >
                        <Text style={styles.likeButtonText}>
                          ♥ {work.likes_count}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
              ))}
            </View>
          )}
        </View>
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
  title: {
    fontSize: fontSize.h1,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.md,
    letterSpacing: 2,
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
  fixedThemeCard: {
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
    ...shadow.lg,
    overflow: 'hidden',
  },
  glassOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: spacing.md,
  },
  sponsorBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    ...shadow.sm,
  },
  sponsorBadgeText: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  themeCardLabel: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.medium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    letterSpacing: 1,
    textAlign: 'center',
  },
  themeCardText: {
    fontSize: fontSize.poem,
    lineHeight: 34,
    color: colors.text.primary,
    fontFamily: fontFamily.medium,
  },
  sponsorInfo: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.medium,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  worksScrollView: {
    flex: 1,
  },
  worksSection: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.h3,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.md,
    letterSpacing: 1,
  },
  loadingContainer: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    ...shadow.sm,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.body,
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
  worksList: {
    gap: spacing.sm,
  },
  workCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadow.md,
  },
  workSection: {
    marginBottom: spacing.sm,
  },
  verticalTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    marginVertical: spacing.sm,
  },
  workVerticalText: {
    fontSize: fontSize.poem,
    lineHeight: 32,
    color: colors.text.primary,
    fontFamily: fontFamily.regular,
  },
  workText: {
    fontSize: fontSize.poem,
    color: colors.text.primary,
    lineHeight: 32,
    marginBottom: spacing.sm,
    fontFamily: fontFamily.regular,
  },
  workFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(107, 123, 79, 0.2)',
  },
  workMetaContainer: {
    flex: 1,
  },
  workAuthor: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.regular,
    color: colors.text.tertiary,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  workMeta: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.regular,
    color: colors.text.tertiary,
  },
  likeButton: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  likeButtonText: {
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.semiBold,
    color: colors.status.error,
    letterSpacing: 0.3,
  },
});
