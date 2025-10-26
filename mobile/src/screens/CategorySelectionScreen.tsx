/**
 * Category Selection Screen
 * カテゴリ選択画面 - 今日のお題を表示（和×モダンデザイン）
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ThemeCategory, HomeStackParamList } from '../types';
import { colors, spacing, borderRadius, shadow, fontSize, fontFamily } from '../theme';

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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* タイトル部分 */}
          <View style={styles.header}>
            <Text style={styles.title}>今日のお題</Text>
            <Text style={styles.subtitle}>心に響くカテゴリを選んでください</Text>
          </View>

          {/* カテゴリーカード */}
          <View style={styles.categoryList}>
            {CATEGORIES.map((category, index) => (
              <TouchableOpacity
                key={category.name}
                onPress={() => handleCategoryPress(category.name)}
                activeOpacity={0.8}
                style={{ marginTop: index === 0 ? 0 : spacing.md }}
              >
                <LinearGradient
                  colors={[
                    colors.category[category.name].gradient[0],
                    colors.category[category.name].gradient[1],
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.categoryCard,
                    {
                      shadowColor: colors.category[category.name].shadow,
                    },
                  ]}
                >
                  {/* グラスモーフィズム効果 */}
                  <View style={styles.glassOverlay}>
                    <View style={styles.cardContent}>
                      <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                      <View style={styles.categoryTextContainer}>
                        <Text style={styles.categoryName}>{category.name}</Text>
                        <Text style={styles.categoryDescription}>{category.description}</Text>
                      </View>
                    </View>

                    {/* 装飾的な和の要素 */}
                    <View style={styles.decoration}>
                      <Text style={styles.decorationText}>▸</Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          {/* フッター余白 */}
          <View style={styles.footer} />
        </View>
      </ScrollView>
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
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  header: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.h1,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    color: colors.text.tertiary,
    letterSpacing: 0.5,
  },
  categoryList: {
    paddingBottom: spacing.md,
  },
  categoryCard: {
    borderRadius: borderRadius.lg,
    ...shadow.lg,
    overflow: 'hidden',
  },
  glassOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: spacing.lg,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryEmoji: {
    fontSize: 56,
    marginRight: spacing.lg,
  },
  categoryTextContainer: {
    flex: 1,
  },
  categoryName: {
    fontSize: fontSize.h3,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    letterSpacing: 2,
  },
  categoryDescription: {
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.regular,
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  decoration: {
    position: 'absolute',
    right: spacing.lg,
    top: '50%',
    transform: [{ translateY: -12 }],
  },
  decorationText: {
    fontSize: 24,
    color: colors.text.inverse,
    opacity: 0.6,
  },
  footer: {
    height: spacing.xl,
  },
});
