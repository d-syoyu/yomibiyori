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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../stores/useAuthStore';
import type { Work, Theme } from '../types';
import api from '../services/api';
import VerticalText from '../components/VerticalText';
import { useThemeStore } from '../stores/useThemeStore';

// Group works by theme date
interface WorksByDate {
  date: string;
  dateObj: Date;
  works: Array<{ work: Work; theme?: Theme }>;
}

export default function MyPoemsScreen() {
  const { user, logout } = useAuthStore();
  const getThemeById = useThemeStore(state => state.getThemeById);

  const [works, setWorks] = useState<Work[]>([]);
  const [themesMap, setThemesMap] = useState<Map<string, Theme>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // Load user's works
  const loadMyWorks = useCallback(async (isRefresh = false) => {
    console.log('[MyPoemsScreen] Loading user works');
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Fetch user's works
      const myWorks = await api.getMyWorks({ limit: 50 });
      console.log('[MyPoemsScreen] Works received:', myWorks.length, 'works');
      setWorks(myWorks);

      // Fetch theme information for each work
      const uniqueThemeIds = [...new Set(myWorks.map(w => w.theme_id))];
      console.log('[MyPoemsScreen] Fetching themes for', uniqueThemeIds.length, 'unique themes');

      const newThemesMap = new Map<string, Theme>();
      await Promise.all(
        uniqueThemeIds.map(async (themeId) => {
          try {
            const theme = await getThemeById(themeId);
            newThemesMap.set(theme.id, theme);
          } catch (error) {
            console.error('[MyPoemsScreen] Failed to fetch theme:', themeId, error);
          }
        })
      );
      setThemesMap(newThemesMap);
    } catch (error: any) {
      console.error('[MyPoemsScreen] Failed to load works:', error);

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
  }, [getThemeById]);

  // Load works on mount
  useEffect(() => {
    loadMyWorks();
  }, [loadMyWorks]);

  const handleLogout = async () => {
    await logout();
  };

  const handleRefresh = () => {
    loadMyWorks(true);
  };

  // Group works by theme date
  const groupWorksByDate = (): WorksByDate[] => {
    const grouped = new Map<string, WorksByDate>();

    works.forEach((work) => {
      const theme = themesMap.get(work.theme_id);
      if (!theme) return;

      const dateStr = theme.date;
      if (!grouped.has(dateStr)) {
        grouped.set(dateStr, {
          date: dateStr,
          dateObj: new Date(dateStr),
          works: [],
        });
      }
      grouped.get(dateStr)!.works.push({ work, theme });
    });

    // Sort by date descending (newest first)
    return Array.from(grouped.values()).sort(
      (a, b) => b.dateObj.getTime() - a.dateObj.getTime()
    );
  };

  const toggleDateExpansion = (date: string) => {
    setExpandedDates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  // Auto-expand the most recent date
  useEffect(() => {
    if (works.length > 0 && themesMap.size > 0) {
      const groupedWorks = groupWorksByDate();
      if (groupedWorks.length > 0 && expandedDates.size === 0) {
        setExpandedDates(new Set([groupedWorks[0].date]));
      }
    }
  }, [works, themesMap]);

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
              <Text style={styles.statValue}>{works.length}</Text>
              <Text style={styles.statLabel}>投稿</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {works.reduce((sum, work) => sum + work.likes_count, 0)}
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
            ) : works.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>まだ作品がありません</Text>
                <Text style={styles.emptyStateSubtext}>
                  お題を選んで俳句を詠んでみましょう
                </Text>
              </View>
            ) : (
              <View style={styles.worksList}>
                {groupWorksByDate().map((dateGroup) => {
                  const isExpanded = expandedDates.has(dateGroup.date);
                  const totalLikes = dateGroup.works.reduce((sum, { work }) => sum + work.likes_count, 0);

                  return (
                    <View key={dateGroup.date} style={styles.dateSection}>
                      {/* Accordion Header */}
                      <TouchableOpacity
                        style={styles.accordionHeader}
                        onPress={() => toggleDateExpansion(dateGroup.date)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.accordionHeaderLeft}>
                          <Text style={styles.accordionDate}>
                            {new Date(dateGroup.date).toLocaleDateString('ja-JP', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </Text>
                          <View style={styles.accordionMeta}>
                            <Text style={styles.accordionMetaText}>
                              {dateGroup.works.length}首
                            </Text>
                            <Text style={styles.accordionMetaDivider}>•</Text>
                            <Text style={styles.accordionMetaText}>
                              ♥ {totalLikes}
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
                          {dateGroup.works.map(({ work, theme }) => {
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
                          })}
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
