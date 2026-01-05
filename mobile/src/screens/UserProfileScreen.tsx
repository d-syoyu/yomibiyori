/**
 * User Profile Screen
 * 他ユーザーのプロフィール画面 - 公開プロフィールと作品一覧
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
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { Work, Theme, WorkDateSummary, RootStackParamList, PublicUserProfile } from '../types';
import api from '../services/api';
import WorkCard from '../components/WorkCard';
import { useThemeStore } from '../stores/useThemeStore';
import { useApiErrorHandler } from '../hooks/useApiErrorHandler';
import { colors, spacing, borderRadius, shadow, fontSize, fontFamily } from '../theme';
import { trackEvent, EventNames } from '../utils/analytics';

type UserProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'UserProfile'>;
type UserProfileScreenRouteProp = RouteProp<RootStackParamList, 'UserProfile'>;

// Works loaded for a specific date
interface DateWorksCache {
  date: string;
  works: Array<{ work: Work; theme?: Theme }>;
  loaded: boolean;
}

export default function UserProfileScreen() {
  const navigation = useNavigation<UserProfileScreenNavigationProp>();
  const route = useRoute<UserProfileScreenRouteProp>();
  const { userId, displayName } = route.params;
  const getThemeById = useThemeStore(state => state.getThemeById);
  const { handleError } = useApiErrorHandler();

  // User profile data
  const [userProfile, setUserProfile] = useState<PublicUserProfile | null>(null);
  // サマリー情報（日付ごとの作品数、いいね数）
  const [dateSummaries, setDateSummaries] = useState<WorkDateSummary[]>([]);
  // 日付ごとの作品キャッシュ
  const [dateWorksCache, setDateWorksCache] = useState<Map<string, DateWorksCache>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      trackEvent(EventNames.SCREEN_VIEWED, {
        screen_name: 'UserProfile',
        user_id: userId,
      });
    }, [userId])
  );

  // Load user profile and works summary
  const loadUserData = useCallback(async (isRefresh = false) => {
    console.log('[UserProfileScreen] Loading user data for:', userId);
    if (isRefresh) {
      setIsRefreshing(true);
      setDateWorksCache(new Map());
    } else {
      setIsLoading(true);
    }

    try {
      // Fetch user profile and works summary in parallel
      const [profile, summaries] = await Promise.all([
        api.getPublicUserProfile(userId),
        api.getUserWorksSummary(userId),
      ]);

      setUserProfile(profile);
      setDateSummaries(summaries);

      trackEvent('user_profile_viewed', {
        viewed_user_id: userId,
        works_count: profile.works_count,
        total_likes: profile.total_likes,
      });
    } catch (error: any) {
      handleError(error, 'user_profile', 'プロフィールの取得に失敗しました');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userId, handleError]);

  // Load works for a specific date
  const loadWorksForDate = useCallback(async (date: string) => {
    console.log('[UserProfileScreen] Loading works for date:', date);

    const cached = dateWorksCache.get(date);
    if (cached && cached.loaded) {
      console.log('[UserProfileScreen] Works already cached for date:', date);
      return;
    }

    try {
      const userWorks = await api.getUserWorks(userId, { limit: 200 });

      // Pre-load themes
      const uniqueThemeIds = [...new Set(userWorks.map(w => w.theme_id))];
      const themesMap = new Map<string, Theme>();
      const BATCH_SIZE = 5;

      for (let i = 0; i < uniqueThemeIds.length; i += BATCH_SIZE) {
        const batch = uniqueThemeIds.slice(i, i + BATCH_SIZE);
        const themes = await Promise.all(
          batch.map(async (id) => {
            try {
              return await getThemeById(id);
            } catch (error) {
              console.warn('[UserProfileScreen] Failed to fetch theme:', id);
              return null;
            }
          })
        );
        themes.forEach((theme) => {
          if (theme) {
            themesMap.set(theme.id, theme);
          }
        });
      }

      // Filter works for the specific date
      const worksForDate: Array<{ work: Work; theme?: Theme }> = [];
      for (const work of userWorks) {
        const theme = themesMap.get(work.theme_id);
        if (theme && theme.date === date) {
          worksForDate.push({ work, theme });
        }
      }

      setDateWorksCache(prev => {
        const newCache = new Map(prev);
        newCache.set(date, {
          date,
          works: worksForDate,
          loaded: true,
        });
        return newCache;
      });
    } catch (error: any) {
      handleError(error, 'user_works', `${date}の作品取得に失敗しました`);
    }
  }, [userId, dateWorksCache, getThemeById, handleError]);

  // Load data on mount
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleRefresh = () => {
    loadUserData(true);
  };

  const toggleDateExpansion = async (date: string) => {
    setExpandedDates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
        loadWorksForDate(date);
      }
      return newSet;
    });
  };

  // Auto-expand the most recent date
  useEffect(() => {
    if (dateSummaries.length > 0 && expandedDates.size === 0) {
      const mostRecentDate = dateSummaries[0].date;
      setExpandedDates(new Set([mostRecentDate]));
      loadWorksForDate(mostRecentDate);
    }
  }, [dateSummaries]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.title}>{displayName}さん</Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A5568" />
            <Text style={styles.loadingText}>読み込み中...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Fixed Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>{userProfile?.display_name || displayName}さん</Text>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              {userProfile?.profile_image_url ? (
                <Image
                  source={{ uri: userProfile.profile_image_url, cache: 'reload' }}
                  style={styles.profileAvatar}
                  key={userProfile.profile_image_url}
                />
              ) : (
                <View style={[styles.profileAvatar, styles.profileAvatarPlaceholder]}>
                  <Ionicons name="person" size={32} color={colors.text.tertiary} />
                </View>
              )}
              <Text style={styles.profileName}>
                {userProfile?.display_name || displayName}
              </Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{userProfile?.works_count || 0}</Text>
                <Text style={styles.statLabel}>投稿</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{userProfile?.total_likes || 0}</Text>
                <Text style={styles.statLabel}>いいね</Text>
              </View>
            </View>
          </View>

          {/* Works Section */}
          <View style={styles.worksSection}>
            <Text style={styles.worksTitle}>
              {userProfile?.display_name || displayName}さんの作品
            </Text>

            {dateSummaries.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>まだ作品がありません</Text>
              </View>
            ) : (
              <View style={styles.worksList}>
                {dateSummaries.map((summary) => {
                  const isExpanded = expandedDates.has(summary.date);
                  const cached = dateWorksCache.get(summary.date);
                  const isLoadingDate = isExpanded && (!cached || !cached.loaded);

                  return (
                    <View key={summary.date} style={styles.dateSection}>
                      {/* Accordion Header */}
                      <TouchableOpacity
                        style={styles.accordionHeader}
                        onPress={() => toggleDateExpansion(summary.date)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.accordionHeaderLeft}>
                          <Text style={styles.accordionDate}>
                            {new Date(summary.date).toLocaleDateString('ja-JP', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </Text>
                          <View style={styles.accordionMeta}>
                            <Text style={styles.accordionMetaText}>
                              {summary.works_count}首
                            </Text>
                            <Text style={styles.accordionMetaDivider}>•</Text>
                            <Text style={styles.accordionMetaText}>
                              ♥ {summary.total_likes}
                            </Text>
                          </View>
                        </View>
                        <Text style={[
                          styles.accordionIcon,
                          isExpanded && styles.accordionIconExpanded
                        ]}>
                          ›
                        </Text>
                      </TouchableOpacity>

                      {/* Accordion Content */}
                      {isExpanded && (
                        <View style={styles.accordionContent}>
                          {isLoadingDate ? (
                            <View style={styles.loadingContainer}>
                              <ActivityIndicator size="small" color="#4A5568" />
                              <Text style={styles.loadingText}>作品を読み込み中...</Text>
                            </View>
                          ) : cached && cached.works.length > 0 ? (
                            cached.works.map(({ work, theme }) => (
                              <WorkCard
                                key={work.id}
                                upperText={theme?.text}
                                lowerText={work.text}
                                category={theme?.category ?? '恋愛'}
                                displayName={work.display_name}
                                profileImageUrl={userProfile?.profile_image_url}
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
                                    context: 'user_profile',
                                  });
                                  Linking.openURL(theme.sponsor_official_url);
                                }}
                                likesCount={work.likes_count}
                              />
                            ))
                          ) : (
                            <View style={styles.emptyState}>
                              <Text style={styles.emptyStateSubtext}>
                                この日の作品が見つかりません
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
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
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -spacing.sm,
  },
  title: {
    fontSize: fontSize.h2,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    letterSpacing: 1,
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: colors.background.card,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadow.sm,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.background.secondary,
    marginBottom: spacing.sm,
  },
  profileAvatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: fontSize.h3,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.background.secondary,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: fontSize.h2,
    fontFamily: fontFamily.semiBold,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.regular,
    color: colors.text.tertiary,
    letterSpacing: 0.2,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.background.secondary,
  },
  worksSection: {
    padding: spacing.lg,
  },
  worksTitle: {
    fontSize: fontSize.h3,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.md,
    letterSpacing: 0.5,
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
  worksList: {
    gap: spacing.sm,
  },
  dateSection: {
    marginBottom: spacing.sm,
  },
  accordionHeader: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadow.sm,
  },
  accordionHeaderLeft: {
    flex: 1,
  },
  accordionDate: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  accordionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  accordionMetaText: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.regular,
    color: colors.text.tertiary,
  },
  accordionMetaDivider: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
    opacity: 0.5,
  },
  accordionIcon: {
    fontSize: 24,
    color: colors.text.tertiary,
    transform: [{ rotate: '0deg' }],
  },
  accordionIconExpanded: {
    transform: [{ rotate: '90deg' }],
  },
  accordionContent: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
});
