/**
 * My Poems Screen
 * マイページ - 自分の投稿した俳句一覧
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
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/useAuthStore';
import { useTutorialStore } from '../stores/useTutorialStore';
import type { Work, Theme, WorkDateSummary, MyPoemsStackParamList } from '../types';
import api from '../services/api';
import VerticalText from '../components/VerticalText';
import { useThemeStore } from '../stores/useThemeStore';
import { useApiErrorHandler } from '../hooks/useApiErrorHandler';
import { colors, spacing, borderRadius, shadow, fontSize, fontFamily } from '../theme';
import { trackEvent, EventNames } from '../utils/analytics';
import TutorialModal from '../components/TutorialModal';

type MyPoemsScreenNavigationProp = NativeStackNavigationProp<MyPoemsStackParamList, 'MyPoemsList'>;

// Works loaded for a specific date
interface DateWorksCache {
  date: string;
  works: Array<{ work: Work; theme?: Theme }>;
  loaded: boolean;
}

export default function MyPoemsScreen() {
  const navigation = useNavigation<MyPoemsScreenNavigationProp>();
  const { user, logout } = useAuthStore();
  const getThemeById = useThemeStore(state => state.getThemeById);
  const { handleError } = useApiErrorHandler();

  // サマリー情報（日付ごとの作品数、いいね数）
  const [dateSummaries, setDateSummaries] = useState<WorkDateSummary[]>([]);
  // 日付ごとの作品キャッシュ
  const [dateWorksCache, setDateWorksCache] = useState<Map<string, DateWorksCache>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // Tutorial modal
  const [tutorialModalVisible, setTutorialModalVisible] = useState(false);

  // Load summary of user's works (日付ごとのサマリーのみ取得)
  const loadMyWorksSummary = useCallback(async (isRefresh = false) => {
    console.log('[MyPoemsScreen] Loading user works summary');
    if (isRefresh) {
      setIsRefreshing(true);
      // リフレッシュ時はキャッシュもクリア
      setDateWorksCache(new Map());
    } else {
      setIsLoading(true);
    }

    try {
      // Fetch summary of user's works (date, count, total_likes)
      const summaries = await api.getMyWorksSummary();
      console.log('[MyPoemsScreen] Summaries received:', summaries.length, 'dates');
      setDateSummaries(summaries);

      // Track my poems viewed event
      trackEvent(EventNames.MY_POEMS_VIEWED, {
        dates_count: summaries.length,
        total_works: summaries.reduce((sum, s) => sum + s.works_count, 0),
        total_likes: summaries.reduce((sum, s) => sum + s.total_likes, 0),
      });
    } catch (error: any) {
      handleError(error, 'user_data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [handleError]);

  // Load works for a specific date (アコーディオンを開いたときに呼ばれる)
  const loadWorksForDate = useCallback(async (date: string) => {
    console.log('[MyPoemsScreen] Loading works for date:', date);

    // すでにキャッシュがあれば何もしない
    const cached = dateWorksCache.get(date);
    if (cached && cached.loaded) {
      console.log('[MyPoemsScreen] Works already cached for date:', date);
      return;
    }

    try {
      // その日の全ての作品を取得（すべてのカテゴリ）
      const myWorks = await api.getMyWorks({ limit: 200 }); // 十分大きな数

      // その日の作品のみフィルタ（テーマの日付でフィルタ）
      const worksForDate: Array<{ work: Work; theme?: Theme }> = [];

      await Promise.all(
        myWorks.map(async (work) => {
          try {
            const theme = await getThemeById(work.theme_id);
            if (theme.date === date) {
              worksForDate.push({ work, theme });
            }
          } catch (error) {
            console.error('[MyPoemsScreen] Failed to fetch theme:', work.theme_id, error);
          }
        })
      );

      console.log('[MyPoemsScreen] Loaded', worksForDate.length, 'works for date:', date);

      // キャッシュに保存
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
      handleError(error, 'user_data', `${date}の作品取得に失敗しました`);
    }
  }, [dateWorksCache, getThemeById, handleError]);

  // Load summary on mount
  useEffect(() => {
    loadMyWorksSummary();
  }, [loadMyWorksSummary]);

  const handleLogout = async () => {
    await logout();
  };

  const handleRefresh = () => {
    loadMyWorksSummary(true);
  };

  const toggleDateExpansion = async (date: string) => {
    setExpandedDates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        // 閉じる
        newSet.delete(date);
      } else {
        // 開く - 作品をロード
        newSet.add(date);
        loadWorksForDate(date); // 非同期でロード
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

  // Clear cache when app goes to background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('[MyPoemsScreen] App going to background, clearing works cache');
        setDateWorksCache(new Map());
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Fixed Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>マイページ</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.tutorialButton}
                onPress={() => setTutorialModalVisible(true)}
              >
                <Ionicons name="help-circle-outline" size={20} color="#4A5568" />
                <Text style={styles.tutorialButtonText}>使い方</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutButtonText}>ログアウト</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.userCard}>
            <View style={styles.userInfo}>
              <View style={styles.userTexts}>
                <Text style={styles.userName}>
                  {user?.display_name || user?.email || 'ユーザー'}
                </Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
              </View>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => navigation.navigate('Profile')}
                activeOpacity={0.7}
              >
                <Ionicons name="settings-outline" size={16} color="#6B7B4F" />
                <Text style={styles.editButtonText}>設定</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {dateSummaries.reduce((sum, s) => sum + s.works_count, 0)}
              </Text>
              <Text style={styles.statLabel}>投稿</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {dateSummaries.reduce((sum, s) => sum + s.total_likes, 0)}
              </Text>
              <Text style={styles.statLabel}>いいね</Text>
            </View>
          </View>
        </View>

        {/* Scrollable Works List */}
        <ScrollView
          style={styles.worksScrollView}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
        >
          <View style={styles.worksSection}>
            <Text style={styles.worksTitle}>あなたの作品</Text>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4A5568" />
                <Text style={styles.loadingText}>作品を読み込み中...</Text>
              </View>
            ) : dateSummaries.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>まだ作品がありません</Text>
                <Text style={styles.emptyStateSubtext}>
                  お題を選んで俳句を詠んでみましょう
                </Text>
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
                            cached.works.map(({ work, theme }) => {
                              // Combine theme (upper verse) and work (lower verse) into one tanka
                              const tankaText = theme ? `${theme.text}\n${work.text}` : work.text;

                              return (
                                <View key={work.id} style={styles.workCard}>
                                  {/* Complete Tanka (短歌) */}
                                  <View style={styles.tankaSection}>
                                    <View style={styles.tankaTextContainer}>
                                      <VerticalText
                                        text={tankaText}
                                        textStyle={styles.tankaVerticalText}
                                        direction="rtl"
                                      />
                                    </View>
                                  </View>

                                  {/* Footer with time and likes */}
                                  <View style={styles.workFooter}>
                                    <Text style={styles.workTime}>
                                      {new Date(work.created_at).toLocaleTimeString('ja-JP', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </Text>
                                    <View style={styles.likesInfo}>
                                      <Text style={styles.likesText}>♥ {work.likes_count}</Text>
                                    </View>
                                  </View>
                                </View>
                              );
                            })
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

        {/* Tutorial Modal */}
        <TutorialModal
          visible={tutorialModalVisible}
          onClose={() => setTutorialModalVisible(false)}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.h1,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    letterSpacing: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  tutorialButton: {
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tutorialButtonText: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.text.secondary,
  },
  logoutButton: {
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  logoutButtonText: {
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.semiBold,
    color: colors.text.secondary,
  },
  userCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    ...shadow.sm,
  },
  userInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userTexts: {
    flex: 1,
  },
  userName: {
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  userEmail: {
    fontSize: 11,
    fontFamily: fontFamily.regular,
    color: colors.text.tertiary,
  },
  editButton: {
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editButtonText: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.text.secondary,
  },
  statsCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-around',
    ...shadow.sm,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.h3,
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
  worksScrollView: {
    flex: 1,
  },
  worksSection: {
    padding: spacing.lg,
  },
  worksTitle: {
    fontSize: fontSize.h2,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.md,
    letterSpacing: 1,
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
  workCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadow.sm,
  },
  tankaSection: {
    marginBottom: spacing.sm,
  },
  tankaTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
    paddingVertical: spacing.sm,
  },
  tankaVerticalText: {
    fontSize: 22,
    lineHeight: 36,
    color: colors.text.primary,
    fontFamily: fontFamily.medium,
  },
  workFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(107, 123, 79, 0.2)',
  },
  workTime: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.regular,
    color: colors.text.tertiary,
  },
  likesInfo: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  likesText: {
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.semiBold,
    color: colors.status.error,
    letterSpacing: 0.3,
  },
});
