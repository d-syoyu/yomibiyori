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
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList, ThemeCategory, Work, Theme } from '../types';
import api from '../services/api';
import VerticalText from '../components/VerticalText';
import { useThemeStore } from '../stores/useThemeStore';

type Props = NativeStackScreenProps<HomeStackParamList, 'Appreciation'>;

const CATEGORIES: ThemeCategory[] = ['恋愛', '季節', '日常', 'ユーモア'];

const CATEGORY_ICONS: Record<ThemeCategory, string> = {
  '恋愛': '💕',
  '季節': '🌸',
  '日常': '☕',
  'ユーモア': '😄',
};

export default function AppreciationScreen({ route }: Props) {
  const getTodayTheme = useThemeStore(state => state.getTodayTheme);

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

      console.log('[AppreciationScreen] Fetching works for theme:', theme.id);
      const worksData = await api.getWorksByTheme(theme.id, { limit: 50, order_by: 'fair_score' });
      console.log('[AppreciationScreen] Works received:', worksData.length, 'works');
      setWorks(worksData);

      setThemesMap(newThemesMap);
    } catch (error: any) {
      console.error('[AppreciationScreen] Failed to load works:', error);

      // Provide user-friendly error messages
      let errorMessage = '作品の取得に失敗しました';
      if (error?.status === 404) {
        errorMessage = 'お題が見つかりませんでした';
      } else if (error?.status === 0) {
        errorMessage = 'ネットワークに接続できません\n接続を確認してください';
      } else if (error?.detail) {
        errorMessage = `エラー: ${error.detail}`;
      }

      Alert.alert('エラー', errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedCategory, getTodayTheme]);

  // Load works when category changes
  useEffect(() => {
    loadWorks();
  }, [loadWorks]);

  // Handle like action
  const handleLike = async (workId: string) => {
    try {
      const response = await api.likeWork(workId);

      // Update the likes count in the local state
      setWorks(prevWorks =>
        prevWorks.map(work =>
          work.id === workId
            ? { ...work, likes_count: response.likes_count }
            : work
        )
      );

      Alert.alert('成功', 'いいねを送りました！');
    } catch (error: any) {
      console.error('Failed to like work:', error);

      // Provide user-friendly error messages
      let errorMessage = 'いいねに失敗しました';
      if (error?.status === 0) {
        errorMessage = 'ネットワークに接続できません\n接続を確認してください';
      } else if (error?.detail) {
        errorMessage = error.detail;
      }

      Alert.alert('エラー', errorMessage);
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

          {/* お題カード（固定） */}
          {currentThemeId && themesMap.has(currentThemeId) && (
            <View style={styles.fixedThemeCard}>
              <Text style={styles.themeCardLabel}>今日のお題（上の句）</Text>
              <View style={styles.verticalTextContainer}>
                <VerticalText
                  text={themesMap.get(currentThemeId)!.text}
                  textStyle={styles.themeCardText}
                  direction="rtl"
                />
              </View>
            </View>
          )}
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 20,
  },
  categorySelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  categoryButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryButtonActive: {
    borderColor: '#4299E1',
    backgroundColor: '#EBF8FF',
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#4299E1',
    fontWeight: 'bold',
  },
  fixedThemeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  themeCardLabel: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 12,
    fontWeight: '600',
  },
  themeCardText: {
    fontSize: 18,
    lineHeight: 30,
    color: '#2D3748',
    fontFamily: 'NotoSerifJP_500Medium',
  },
  worksScrollView: {
    flex: 1,
  },
  worksSection: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 16,
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
  worksList: {
    gap: 12,
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
  workSection: {
    marginBottom: 8,
  },
  verticalTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    marginVertical: 8,
  },
  workVerticalText: {
    fontSize: 18,
    lineHeight: 28,
    color: '#2D3748',
    fontFamily: 'NotoSerifJP_400Regular',
  },
  workText: {
    fontSize: 18,
    color: '#2D3748',
    lineHeight: 28,
    marginBottom: 12,
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
  workAuthor: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 4,
  },
  workMeta: {
    fontSize: 12,
    color: '#A0AEC0',
  },
  likeButton: {
    backgroundColor: '#EDF2F7',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  likeButtonText: {
    fontSize: 14,
    color: '#E53E3E',
    fontWeight: '600',
  },
});
