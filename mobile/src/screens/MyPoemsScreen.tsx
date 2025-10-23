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

export default function MyPoemsScreen() {
  const { user, logout } = useAuthStore();
  const [works, setWorks] = useState<Work[]>([]);
  const [themesMap, setThemesMap] = useState<Map<string, Theme>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
            const theme = await api.getThemeById(themeId);
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
  }, []);

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
                {works.map((work) => {
                  const theme = themesMap.get(work.theme_id);
                  // Combine theme (upper verse) and work (lower verse) into one tanka
                  const tankaText = theme ? `${theme.text}\n${work.text}` : work.text;

                  return (
                    <View key={work.id} style={styles.workCard}>
                      {/* Complete Tanka (短歌) */}
                      <View style={styles.tankaSection}>
                        <Text style={styles.tankaSectionLabel}>短歌</Text>
                        <View style={styles.tankaTextContainer}>
                          <VerticalText
                            text={tankaText}
                            textStyle={styles.tankaVerticalText}
                            direction="rtl"
                          />
                        </View>
                      </View>

                      {/* Footer with date and likes */}
                      <View style={styles.workFooter}>
                        <View style={styles.workMetaContainer}>
                          <Text style={styles.workDate}>
                            {new Date(work.created_at).toLocaleDateString('ja-JP', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </Text>
                          <Text style={styles.workTime}>
                            {new Date(work.created_at).toLocaleTimeString('ja-JP', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </View>
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
    gap: 16,
  },
  workCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tankaSection: {
    marginBottom: 16,
  },
  tankaSectionLabel: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  tankaTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
    paddingVertical: 16,
  },
  tankaVerticalText: {
    fontSize: 18,
    lineHeight: 32,
    color: '#2D3748',
    fontWeight: '500',
  },
  workFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  workMetaContainer: {
    flex: 1,
  },
  workDate: {
    fontSize: 12,
    color: '#4A5568',
    marginBottom: 4,
    fontWeight: '500',
  },
  workTime: {
    fontSize: 12,
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
