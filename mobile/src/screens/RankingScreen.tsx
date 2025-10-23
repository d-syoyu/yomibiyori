/**
 * Ranking Screen
 * ランキング画面 - お題ごとのランキング表示
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../services/api';
import type { ThemeCategory, RankingEntry, Theme } from '../types';
import VerticalText from '../components/VerticalText';

const CATEGORIES: ThemeCategory[] = ['恋愛', '季節', '日常', 'ユーモア'];

const CATEGORY_ICONS: Record<ThemeCategory, string> = {
  '恋愛': '💕',
  '季節': '🌸',
  '日常': '☕',
  'ユーモア': '😄',
};

export default function RankingScreen() {
  const [selectedCategory, setSelectedCategory] = useState<ThemeCategory>('恋愛');
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [theme, setTheme] = useState<Theme | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRankings = async (category: ThemeCategory) => {
    try {
      setLoading(true);
      setError(null);

      // Get today's theme for the category
      const themeData = await api.getTodayTheme(category);
      setTheme(themeData);

      // Fetch rankings for the theme
      const rankingData = await api.getRanking(themeData.id);
      setRankings(rankingData);
    } catch (err: any) {
      console.error('Failed to fetch rankings:', err);

      // Provide user-friendly error messages
      let errorMessage = 'ランキングの取得に失敗しました';
      if (err?.status === 404) {
        errorMessage = 'まだランキングが作成されていません\n22:00以降に確定されます';
      } else if (err?.detail === 'Ranking not available') {
        errorMessage = 'まだランキングが作成されていません\n22:00以降に確定されます';
      } else if (err?.status === 0) {
        errorMessage = 'ネットワークに接続できません\n接続を確認してください';
      }

      setError(errorMessage);
      setRankings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Fixed Header */}
        <View style={styles.header}>
          <Text style={styles.title}>ランキング</Text>
          <Text style={styles.subtitle}>今日の人気作品</Text>

          {/* Category Selector */}
          <View style={styles.categorySelector}>
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  selectedCategory === category && styles.categoryButtonActive,
                ]}
                onPress={() => handleCategoryChange(category)}
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

          {/* Theme Display */}
          {theme && (
            <View style={styles.themeCard}>
              <Text style={styles.themeLabel}>今日のお題（上の句）</Text>
              <View style={styles.verticalTextContainer}>
                <VerticalText
                  text={theme.text}
                  textStyle={styles.themeVerticalText}
                  direction="rtl"
                />
              </View>
            </View>
          )}
        </View>

        {/* Scrollable Ranking List */}
        <ScrollView
          style={styles.rankingScrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A5568" />
            <Text style={styles.loadingText}>読み込み中...</Text>
          </View>
        )}

        {/* Error State */}
        {error && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => fetchRankings(selectedCategory)}
            >
              <Text style={styles.retryButtonText}>再試行</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty State */}
        {!loading && !error && rankings.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>ランキングデータがありません</Text>
            <Text style={styles.emptyStateSubtext}>
              作品が投稿されるとランキングが表示されます
            </Text>
          </View>
        )}

        {/* Ranking List */}
        {!loading && rankings.length > 0 && (
          <View style={styles.rankingList}>
            {rankings.map((entry) => (
              <View key={entry.work_id} style={styles.rankingCard}>
                <View
                  style={[
                    styles.rankBadge,
                    entry.rank === 1 && styles.rankBadgeGold,
                    entry.rank === 2 && styles.rankBadgeSilver,
                    entry.rank === 3 && styles.rankBadgeBronze,
                  ]}
                >
                  <Text style={styles.rankText}>{entry.rank}</Text>
                </View>
                <View style={styles.workInfo}>
                  <View style={styles.workVerticalContainer}>
                    <VerticalText
                      text={entry.text}
                      textStyle={styles.workVerticalText}
                      direction="ltr"
                    />
                  </View>
                  <Text style={styles.workAuthor}>by {entry.user_name}</Text>
                </View>
                <Text style={styles.scoreText}>
                  {(entry.score * 100).toFixed(1)}%
                </Text>
              </View>
            ))}
          </View>
        )}
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    marginBottom: 20,
  },
  rankingScrollView: {
    flex: 1,
    paddingHorizontal: 24,
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
  themeCard: {
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
  themeLabel: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 12,
    fontWeight: '600',
  },
  verticalTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    marginVertical: 8,
  },
  themeVerticalText: {
    fontSize: 18,
    lineHeight: 30,
    color: '#2D3748',
    fontWeight: '600',
  },
  loadingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
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
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#4299E1',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  rankingList: {
    gap: 12,
    paddingTop: 16,
    paddingBottom: 24,
  },
  rankingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4A5568',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rankBadgeGold: {
    backgroundColor: '#FFD700',
  },
  rankBadgeSilver: {
    backgroundColor: '#C0C0C0',
  },
  rankBadgeBronze: {
    backgroundColor: '#CD7F32',
  },
  rankText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  workInfo: {
    flex: 1,
    alignItems: 'center',
  },
  workVerticalContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
    marginBottom: 8,
  },
  workVerticalText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#2D3748',
  },
  workAuthor: {
    fontSize: 12,
    color: '#718096',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568',
  },
});
