/**
 * Action Selection Screen
 * アクション選択画面 - 詠む or 鑑賞
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList, ThemeCategory } from '../types';
import api from '../services/api';

type Props = NativeStackScreenProps<HomeStackParamList, 'ActionSelection'>;
type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

const CATEGORY_INFO: Record<ThemeCategory, { emoji: string; name: string }> = {
  '恋愛': { emoji: '💕', name: '恋愛' },
  '季節': { emoji: '🌸', name: '季節' },
  '日常': { emoji: '☕', name: '日常' },
  'ユーモア': { emoji: '😄', name: 'ユーモア' },
};

export default function ActionSelectionScreen({ route }: Props) {
  const navigation = useNavigation<NavigationProp>();
  const { category } = route.params;
  const [isLoading, setIsLoading] = useState(false);

  const categoryInfo = CATEGORY_INFO[category];

  const handleCompose = async () => {
    setIsLoading(true);
    try {
      // お題を取得
      const theme = await api.getTodayTheme(category);
      navigation.navigate('Composition', { theme });
    } catch (error: any) {
      console.error('Failed to fetch theme:', error);
      Alert.alert('エラー', 'お題の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppreciate = () => {
    navigation.navigate('Appreciation', { category });
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* カテゴリ表示 */}
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryEmoji}>{categoryInfo.emoji}</Text>
          <Text style={styles.categoryName}>{categoryInfo.name}</Text>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  categoryHeader: {
    alignItems: 'center',
    marginBottom: 48,
  },
  categoryEmoji: {
    fontSize: 72,
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
