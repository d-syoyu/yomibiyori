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
  Alert,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../stores/useAuthStore';
import type { Work, Theme, WorkDateSummary } from '../types';
import api from '../services/api';
import VerticalText from '../components/VerticalText';
import { useThemeStore } from '../stores/useThemeStore';

// Works loaded for a specific date
interface DateWorksCache {
  date: string;
  works: Array<{ work: Work; theme?: Theme }>;
  loaded: boolean;
}

export default function MyPoemsScreen() {
  const { user, logout } = useAuthStore();
  const getThemeById = useThemeStore(state => state.getThemeById);

  // サマリー情報（日付ごとの作品数、いいね数）
  const [dateSummaries, setDateSummaries] = useState<WorkDateSummary[]>([]);
  // 日付ごとの作品キャッシュ
  const [dateWorksCache, setDateWorksCache] = useState<Map<string, DateWorksCache>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

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
    } catch (error: any) {
      console.error('[MyPoemsScreen] Failed to load works summary:', error);

      let errorMessage = '作品の取得に失敗しました';
      if (error?.status === 0) {
        errorMessage = 'ネットワークに接続できません\n接続を確認してください';
      } else if (error?.detail) {
        errorMessage = `エラー: ${error.detail}`;
      }

      Alert.alert('エラー', errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

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
      console.error('[MyPoemsScreen] Failed to load works for date:', date, error);

      let errorMessage = `${date}の作品取得に失敗しました`;
      if (error?.status === 0) {
        errorMessage = 'ネットワークに接続できません\n接続を確認してください';
      } else if (error?.detail) {
        errorMessage = `エラー: ${error.detail}`;
      }

      Alert.alert('エラー', errorMessage);
    }
  }, [dateWorksCache, getThemeById]);

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
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>ログアウト</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.userCard}>
            <Text style={styles.userName}>
              {user?.display_name || user?.email || 'ユーザー'}
            </Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
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
              <Text style={styles.statLabel}>共鳴</Text>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  header: {
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  logoutButton: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutButtonText: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '600',
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#718096',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4A5568',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#718096',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
  },
  worksScrollView: {
    flex: 1,
  },
  worksSection: {
    padding: 24,
  },
  worksTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#4A5568',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
  },
  loadingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#718096',
  },
  worksList: {
    gap: 12,
  },
  dateSection: {
    marginBottom: 12,
  },
  accordionHeader: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  accordionHeaderLeft: {
    flex: 1,
  },
  accordionDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 6,
  },
  accordionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accordionMetaText: {
    fontSize: 13,
    color: '#718096',
  },
  accordionMetaDivider: {
    fontSize: 13,
    color: '#CBD5E0',
  },
  accordionIcon: {
    fontSize: 24,
    color: '#CBD5E0',
    transform: [{ rotate: '0deg' }],
  },
  accordionIconExpanded: {
    transform: [{ rotate: '90deg' }],
  },
  accordionContent: {
    marginTop: 8,
    gap: 12,
  },
  workCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tankaSection: {
    marginBottom: 12,
  },
  tankaTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
    paddingVertical: 12,
  },
  tankaVerticalText: {
    fontSize: 18,
    lineHeight: 32,
    color: '#2D3748',
    fontFamily: 'NotoSerifJP_500Medium',
  },
  workFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  workTime: {
    fontSize: 11,
    color: '#A0AEC0',
  },
  likesInfo: {
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  likesText: {
    fontSize: 14,
    color: '#E53E3E',
    fontWeight: '600',
  },
});
