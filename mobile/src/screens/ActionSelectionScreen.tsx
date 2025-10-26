/**
 * Action Selection Screen
 * アクション選択画面 - 詠む or 鑑賞
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList, ThemeCategory } from '../types';
import api from '../services/api';
import { useThemeStore } from '../stores/useThemeStore';
import { useToastStore } from '../stores/useToastStore';
import CategoryIcon from '../components/CategoryIcon';

type Props = NativeStackScreenProps<HomeStackParamList, 'ActionSelection'>;
type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

export default function ActionSelectionScreen({ route }: Props) {
  const navigation = useNavigation<NavigationProp>();
  const getTodayTheme = useThemeStore(state => state.getTodayTheme);
  const showError = useToastStore(state => state.showError);
  const { category } = route.params;
  const [isLoading, setIsLoading] = useState(false);

  const handleCompose = async () => {
    setIsLoading(true);
    try {
      // お題を取得（キャッシュから）
      const theme = await getTodayTheme(category);
      navigation.navigate('Composition', { theme });
    } catch (error: any) {
      console.error('Failed to fetch theme:', error);

      // Provide user-friendly error messages
      let errorMessage = 'お題の取得に失敗しました';
      if (error?.status === 404) {
        errorMessage = '今日のお題がまだ作成されていません';
      } else if (error?.status === 0) {
        errorMessage = 'ネットワークに接続できません\n接続を確認してください';
      } else if (error?.detail) {
        errorMessage = error.detail;
      }

      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppreciate = () => {
    navigation.navigate('Appreciation', { category });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
      <View style={styles.content}>
        {/* カテゴリ表示 */}
        <View style={styles.categoryHeader}>
          <View style={styles.categoryIconWrapper}>
            <CategoryIcon category={category} size={72} color="#2D3748" />
          </View>
          <Text style={styles.categoryName}>{category}</Text>
          <Text style={styles.subtitle}>何をしますか？</Text>
        </View>

        {/* アクションボタン */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={handleCompose}
            disabled={isLoading}
          >
            <View style={styles.actionIconContainer}>
              <Text style={styles.actionIcon}>✍️</Text>
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>一句を詠む</Text>
              <Text style={styles.actionDescription}>下の句を投稿する</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={handleAppreciate}
          >
            <View style={styles.actionIconContainer}>
              <Text style={styles.actionIcon}>📖</Text>
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>作品を鑑賞</Text>
              <Text style={styles.actionDescription}>他の人の一句を楽しむ</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 戻るボタン */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← カテゴリ選択に戻る</Text>
        </TouchableOpacity>
      </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    justifyContent: 'center',
  },
  categoryHeader: {
    alignItems: 'center',
    marginBottom: 48,
  },
  categoryIconWrapper: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  categoryName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
  },
  actionButtons: {
    gap: 16,
    marginBottom: 32,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EDF2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionIcon: {
    fontSize: 28,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#718096',
  },
  chevron: {
    fontSize: 32,
    color: '#CBD5E0',
  },
  backButton: {
    alignItems: 'center',
    padding: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4A5568',
  },
});
