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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList, ThemeCategory, Work } from '../types';
import api from '../services/api';

type Props = NativeStackScreenProps<HomeStackParamList, 'Appreciation'>;

const CATEGORIES: ThemeCategory[] = ['恋愛', '季節', '日常', 'ユーモア'];

export default function AppreciationScreen({ route }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<ThemeCategory | undefined>(
    route.params?.category
  );
  const [works, setWorks] = useState<Work[]>([]);
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
      // First, get today's theme for the category
      console.log('[AppreciationScreen] Fetching theme...');
      const theme = await api.getTodayTheme(selectedCategory);
      console.log('[AppreciationScreen] Theme received:', theme);
      setCurrentThemeId(theme.id);

      // Then, get works for that theme
      console.log('[AppreciationScreen] Fetching works for theme:', theme.id);
      const worksData = await api.getWorksByTheme(theme.id, { limit: 50 });
      console.log('[AppreciationScreen] Works received:', worksData.length, 'works');
      setWorks(worksData);
    } catch (error: any) {
      console.error('[AppreciationScreen] Failed to load works:', error);
      const errorDetail = error.detail || error.message || JSON.stringify(error);
      console.error('[AppreciationScreen] Error details:', errorDetail);
      Alert.alert('エラー', `作品の取得に失敗しました: ${errorDetail}`);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedCategory]);

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
      const errorMessage = error.detail || 'いいねに失敗しました';
      Alert.alert('エラー', errorMessage);
    }
  };

  const handleRefresh = () => {
    loadWorks(true);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.content}>
        <Text style={styles.title}>鑑賞</Text>

        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          style={styles.categoryFilter}
        >
          <TouchableOpacity
            style={[
              styles.categoryChip,
              !selectedCategory && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(undefined)}
          >
            <Text
              style={[
                styles.categoryChipText,
                !selectedCategory && styles.categoryChipTextActive,
              ]}
            >
              すべて
            </Text>
          </TouchableOpacity>

          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                selectedCategory === category && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === category && styles.categoryChipTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.worksSection}>
          <Text style={styles.sectionTitle}>
            {selectedCategory ? `${selectedCategory}の作品` : '今日の作品'}
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
                  <Text style={styles.workText}>{work.text}</Text>
                  <View style={styles.workFooter}>
                    <Text style={styles.workMeta}>
                      {new Date(work.created_at).toLocaleTimeString('ja-JP', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
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
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 16,
  },
  categoryFilter: {
    marginBottom: 24,
    flexGrow: 0,
  },
  categoryChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#4A5568',
    borderColor: '#4A5568',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#4A5568',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  worksSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
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
