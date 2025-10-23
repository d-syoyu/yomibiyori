/**
 * Category Selection Screen
 * カテゴリ選択画面 - 今日のお題を表示
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ThemeCategory, HomeStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, 'CategorySelection'>;

const CATEGORIES: { name: ThemeCategory; emoji: string; description: string }[] = [
  { name: '恋愛', emoji: '💕', description: '恋や愛に関するお題' },
  { name: '季節', emoji: '🌸', description: '四季折々のお題' },
  { name: '日常', emoji: '☕', description: '日々の暮らしのお題' },
  { name: 'ユーモア', emoji: '😄', description: 'ユーモラスなお題' },
];

export default function CategorySelectionScreen() {
  const navigation = useNavigation<NavigationProp>();

  const handleCategoryPress = (category: ThemeCategory) => {
    // アクション選択画面に遷移
    navigation.navigate('ActionSelection', { category });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>今日のお題</Text>
        <Text style={styles.subtitle}>カテゴリを選択してください</Text>

        <View style={styles.categoryList}>
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.name}
              style={styles.categoryCard}
              onPress={() => handleCategoryPress(category.name)}
            >
              <Text style={styles.categoryEmoji}>{category.emoji}</Text>
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.categoryDescription}>{category.description}</Text>
            </TouchableOpacity>
          ))}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#718096',
  },
  content: {
    padding: 24,
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
    marginBottom: 24,
  },
  categoryList: {
    gap: 16,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 8,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
  },
});
