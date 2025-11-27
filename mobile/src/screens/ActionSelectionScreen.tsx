/**
 * Action Selection Screen
 * アクション選択画面 - 詠む or 鑑賞（和×モダンデザイン）
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList, RootStackParamList, ThemeCategory } from '../types';
import { useThemeStore } from '../stores/useThemeStore';
import { useToastStore } from '../stores/useToastStore';
import { useAuthStore } from '../stores/useAuthStore';
import CategoryIcon from '../components/CategoryIcon';
import ActionIcon from '../components/ActionIcon';
import { trackEvent, EventNames } from '../utils/analytics';
import { colors, spacing, borderRadius, shadow, fontSize, fontFamily } from '../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'ActionSelection'>;
type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

export default function ActionSelectionScreen({ route }: Props) {
  const navigation = useNavigation<NavigationProp>();
  const getTodayTheme = useThemeStore(state => state.getTodayTheme);
  const showError = useToastStore(state => state.showError);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const { category } = route.params;
  const [isLoading, setIsLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      trackEvent(EventNames.SCREEN_VIEWED, {
        screen_name: 'ActionSelection',
        category,
      });
    }, [category])
  );

  const handleCompose = async () => {
    // Check authentication before allowing composition
    if (!isAuthenticated) {
      showError('投稿するにはログインが必要です');
      // Navigate to login screen in root navigator
      navigation.dispatch(
        CommonActions.navigate({
          name: 'Login',
        })
      );
      return;
    }

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

  // カテゴリに応じたグラデーション色を取得
  const categoryColors = colors.category[category];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* カテゴリヘッダー */}
          <View style={styles.categoryHeader}>
            <View style={[styles.categoryIconWrapper, { borderColor: categoryColors.gradient[0] }]}>
              <CategoryIcon category={category} size={48} color={categoryColors.gradient[0]} />
            </View>
            <Text style={styles.categoryName}>{category}</Text>
            <Text style={styles.subtitle}>何をしますか？</Text>
          </View>

          {/* アクションカード */}
          <View style={styles.actionButtons}>
            {/* 一句を詠む */}
            <TouchableOpacity
              onPress={handleCompose}
              disabled={isLoading}
              activeOpacity={0.7}
              style={styles.actionCard}
            >
              <View style={[styles.actionIconBg, { backgroundColor: `${categoryColors.gradient[0]}20` }]}>
                <ActionIcon action="compose" size={28} color={categoryColors.gradient[0]} />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>一句を詠む</Text>
                <Text style={styles.actionDescription}>下の句を投稿する</Text>
              </View>
              <Text style={[styles.chevron, { color: colors.text.tertiary }]}>›</Text>
            </TouchableOpacity>

            {/* 作品を鑑賞 */}
            <TouchableOpacity
              onPress={handleAppreciate}
              activeOpacity={0.7}
              style={[styles.actionCard, styles.secondCard]}
            >
              <View style={[styles.actionIconBg, { backgroundColor: `${categoryColors.gradient[1]}20` }]}>
                <ActionIcon action="appreciate" size={28} color={categoryColors.gradient[1]} />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>作品を鑑賞</Text>
                <Text style={styles.actionDescription}>他の人の一句を楽しむ</Text>
              </View>
              <Text style={[styles.chevron, { color: colors.text.tertiary }]}>›</Text>
            </TouchableOpacity>
          </View>

          {/* 戻るボタン */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>← カテゴリ選択に戻る</Text>
          </TouchableOpacity>

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
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    justifyContent: 'center',
    minHeight: '100%',
  },
  categoryHeader: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  categoryIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    marginBottom: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.card,
  },
  categoryName: {
    fontSize: fontSize.h2,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    color: colors.text.tertiary,
    letterSpacing: 0.5,
  },
  actionButtons: {
    marginBottom: spacing.xl,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondCard: {
    marginTop: spacing.md,
  },
  actionIconBg: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: fontSize.h3 - 2,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    letterSpacing: 1,
  },
  actionDescription: {
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.regular,
    color: colors.text.tertiary,
    letterSpacing: 0.5,
  },
  chevron: {
    fontSize: 28,
    fontWeight: '300',
    marginLeft: spacing.sm,
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  backButtonText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  footer: {
    height: spacing.xl,
  },
});
