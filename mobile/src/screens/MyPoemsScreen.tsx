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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CommonActions, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/useAuthStore';
import { useTutorialStore } from '../stores/useTutorialStore';
import type { Work, Theme, WorkDateSummary, MyPoemsStackParamList } from '../types';
import type { SharePayload } from '../types/share';
import api from '../services/api';
import WorkCard from '../components/WorkCard';
import ShareSheet from '../components/ShareSheet';
import EditWorkModal from '../components/EditWorkModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { useThemeStore } from '../stores/useThemeStore';
import { useApiErrorHandler } from '../hooks/useApiErrorHandler';
import { colors, spacing, borderRadius, shadow, fontSize, fontFamily } from '../theme';
import { trackEvent, EventNames } from '../utils/analytics';
import TutorialModal from '../components/TutorialModal';
import { createProfileSharePayload } from '../utils/share';
import { useToastStore } from '../stores/useToastStore';

type MyPoemsScreenNavigationProp = NativeStackNavigationProp<MyPoemsStackParamList, 'MyPoemsList'>;

// Works loaded for a specific date
interface DateWorksCache {
  date: string;
  works: Array<{ work: Work; theme?: Theme }>;
  loaded: boolean;
}

export default function MyPoemsScreen() {
  const navigation = useNavigation<MyPoemsScreenNavigationProp>();
  const { user, logout, isAuthenticated } = useAuthStore();
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
  const [sharePayload, setSharePayload] = useState<SharePayload | null>(null);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);

  // Edit/Delete modals
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedWork, setSelectedWork] = useState<{ work: Work; theme?: Theme } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showSuccess, showError } = useToastStore();

  useFocusEffect(
    useCallback(() => {
      trackEvent(EventNames.SCREEN_VIEWED, {
        screen_name: 'MyPoems',
      });
    }, [])
  );

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
      const myWorks = await api.getMyWorks({ limit: 200 });

      // 最適化: ユニークなテーマIDを収集し、バッチでプリロード
      const uniqueThemeIds = [...new Set(myWorks.map(w => w.theme_id))];
      console.log('[MyPoemsScreen] Pre-loading', uniqueThemeIds.length, 'unique themes');

      // テーマを並列でプリロード（キャッシュがあればスキップされる）
      const themesMap = new Map<string, Theme>();
      const BATCH_SIZE = 5; // 並列度を制限

      for (let i = 0; i < uniqueThemeIds.length; i += BATCH_SIZE) {
        const batch = uniqueThemeIds.slice(i, i + BATCH_SIZE);
        const themes = await Promise.all(
          batch.map(async (id) => {
            try {
              return await getThemeById(id);
            } catch (error) {
              console.warn('[MyPoemsScreen] Failed to fetch theme:', id);
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

      // その日の作品のみフィルタ（キャッシュ済みテーマから取得）
      const worksForDate: Array<{ work: Work; theme?: Theme }> = [];
      for (const work of myWorks) {
        const theme = themesMap.get(work.theme_id);
        if (theme && theme.date === date) {
          worksForDate.push({ work, theme });
        }
      }

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

  // Load summary on mount (only if authenticated)
  useEffect(() => {
    if (isAuthenticated) {
      loadMyWorksSummary();
    }
  }, [loadMyWorksSummary, isAuthenticated]);

  const handleLogout = async () => {
    await logout();
  };

  const handleRefresh = () => {
    loadMyWorksSummary(true);
  };

  const openShareSheet = useCallback((work: Work, theme?: Theme) => {
    const payload = createProfileSharePayload(work, theme);
    setSharePayload(payload);
    setShareSheetVisible(true);
  }, []);

  const closeShareSheet = useCallback(() => {
    setShareSheetVisible(false);
    setSharePayload(null);
  }, []);

  // Edit handlers
  const handleEditPress = useCallback((work: Work, theme?: Theme) => {
    setSelectedWork({ work, theme });
    setEditModalVisible(true);
  }, []);

  const handleEditSave = useCallback(async (text: string) => {
    if (!selectedWork) return;
    setIsUpdating(true);
    try {
      await api.updateWork(selectedWork.work.id, { text });
      // Update local cache
      setDateWorksCache(prev => {
        const newCache = new Map(prev);
        for (const [date, cached] of newCache) {
          const updatedWorks = cached.works.map(item => {
            if (item.work.id === selectedWork.work.id) {
              return { ...item, work: { ...item.work, text } };
            }
            return item;
          });
          newCache.set(date, { ...cached, works: updatedWorks });
        }
        return newCache;
      });
      setEditModalVisible(false);
      setSelectedWork(null);
      showSuccess('作品を更新しました');
      trackEvent('work_updated', {
        work_id: selectedWork.work.id,
      });
    } catch (error: any) {
      handleError(error, 'update_work', '作品の更新に失敗しました');
    } finally {
      setIsUpdating(false);
    }
  }, [selectedWork, handleError, showSuccess]);

  const handleEditClose = useCallback(() => {
    setEditModalVisible(false);
    setSelectedWork(null);
  }, []);

  // Delete handlers
  const handleDeletePress = useCallback((work: Work, theme?: Theme) => {
    setSelectedWork({ work, theme });
    setDeleteModalVisible(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedWork) return;
    setIsDeleting(true);
    try {
      await api.deleteWork(selectedWork.work.id);
      // Remove from local cache
      const workThemeDate = selectedWork.theme?.date;
      setDateWorksCache(prev => {
        const newCache = new Map(prev);
        for (const [date, cached] of newCache) {
          const filteredWorks = cached.works.filter(item => item.work.id !== selectedWork.work.id);
          newCache.set(date, { ...cached, works: filteredWorks });
        }
        return newCache;
      });
      // Update summary
      if (workThemeDate) {
        setDateSummaries(prev => prev.map(summary => {
          if (summary.date === workThemeDate) {
            return {
              ...summary,
              works_count: Math.max(0, summary.works_count - 1),
              total_likes: Math.max(0, summary.total_likes - (selectedWork.work.likes_count || 0)),
            };
          }
          return summary;
        }).filter(summary => summary.works_count > 0));
      }
      setDeleteModalVisible(false);
      setSelectedWork(null);
      showSuccess('作品を削除しました');
      trackEvent('work_deleted', {
        work_id: selectedWork.work.id,
      });
    } catch (error: any) {
      handleError(error, 'delete_work', '作品の削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  }, [selectedWork, handleError, showSuccess]);

  const handleDeleteClose = useCallback(() => {
    setDeleteModalVisible(false);
    setSelectedWork(null);
  }, []);

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

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>マイページ</Text>
          </View>
          <View style={styles.loginPromptContainer}>
            <View style={styles.loginPromptCard}>
              <Ionicons name="person-circle-outline" size={80} color="#6B7B4F" />
              <Text style={styles.loginPromptTitle}>ログインが必要です</Text>
              <Text style={styles.loginPromptText}>
                マイページを表示するには{'\n'}ログインしてください
              </Text>
              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => {
                  // Navigate to Login screen in root navigator
                  navigation.dispatch(
                    CommonActions.navigate({
                      name: 'Login',
                    })
                  );
                }}
              >
                <Text style={styles.loginButtonText}>ログイン / 新規登録</Text>
              </TouchableOpacity>
            </View>
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
                onPress={() => navigation.navigate('ProfileSetup')}
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
                            cached.works.map(({ work, theme }) => (
                              <WorkCard
                                key={work.id}
                                upperText={theme?.text}
                                lowerText={work.text}
                                category={theme?.category ?? '恋愛'}
                                displayName={work.display_name}
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
                                    context: 'my_poems',
                                  });
                                  Linking.openURL(theme.sponsor_official_url);
                                }}
                                likesCount={work.likes_count}
                                customActions={
                                  <View style={styles.workCardActions}>
                                    <TouchableOpacity
                                      style={styles.actionButton}
                                      onPress={() => handleDeletePress(work, theme)}
                                      accessibilityLabel="削除"
                                    >
                                      <Ionicons name="trash-outline" size={20} color={colors.status.error} />
                                    </TouchableOpacity>
                                    <View style={styles.actionSpacer} />
                                    <TouchableOpacity
                                      style={styles.actionButton}
                                      onPress={() => openShareSheet(work, theme)}
                                      accessibilityLabel="共有"
                                    >
                                      <Ionicons name="share-outline" size={20} color={colors.text.secondary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      style={styles.actionButton}
                                      onPress={() => handleEditPress(work, theme)}
                                      accessibilityLabel="編集"
                                    >
                                      <Ionicons name="pencil-outline" size={20} color={colors.text.secondary} />
                                    </TouchableOpacity>
                                    <View style={styles.likeBadge}>
                                      <Ionicons name="heart" size={14} color={colors.status.error} />
                                      <Text style={styles.likeText}>{work.likes_count}</Text>
                                    </View>
                                  </View>
                                }
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

        {/* Tutorial Modal */}
        <TutorialModal
          visible={tutorialModalVisible}
          onClose={() => setTutorialModalVisible(false)}
        />

        <ShareSheet
          visible={shareSheetVisible}
          payload={sharePayload}
          onClose={closeShareSheet}
        />

        {/* Edit Work Modal */}
        <EditWorkModal
          visible={editModalVisible}
          work={selectedWork?.work ?? null}
          onClose={handleEditClose}
          onSave={handleEditSave}
          isSaving={isUpdating}
        />

        {/* Delete Confirm Modal */}
        <DeleteConfirmModal
          visible={deleteModalVisible}
          onClose={handleDeleteClose}
          onConfirm={handleDeleteConfirm}
          isDeleting={isDeleting}
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
  loginPromptContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  loginPromptCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    ...shadow.md,
  },
  loginPromptTitle: {
    fontSize: fontSize.h2,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    letterSpacing: 1,
  },
  loginPromptText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
    letterSpacing: 0.5,
  },
  loginButton: {
    backgroundColor: colors.text.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    ...shadow.sm,
  },
  loginButtonText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    color: colors.text.inverse,
    letterSpacing: 0.5,
  },
  workCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionSpacer: {
    flex: 1,
  },
  actionButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.8,
  },
  likeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.secondary,
  },
  likeText: {
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.semiBold,
    color: colors.status.error,
  },
});
