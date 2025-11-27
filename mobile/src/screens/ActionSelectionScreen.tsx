/**
 * Action Selection Screen
 * アクション選択画面 - 詠む or 鑑賞（和×モダンデザイン）
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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
            <LinearGradient
              colors={[categoryColors.gradient[0], categoryColors.gradient[1]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.categoryIconWrapper, { shadowColor: categoryColors.shadow }]}
            >
              <View style={styles.glassOverlaySmall}>
                <CategoryIcon category={category} size={56} color={colors.text.primary} />
              </View>
            </LinearGradient>
            <Text style={styles.categoryName}>{category}</Text>
            <Text style={styles.subtitle}>何をしますか？</Text>
          </View>

          {/* アクションカード */}
          <View style={styles.actionButtons}>
            {/* 一句を詠む */}
            <TouchableOpacity
              onPress={handleCompose}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[categoryColors.gradient[0], categoryColors.gradient[1]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.actionCard, { shadowColor: categoryColors.shadow }]}
              >
                <View style={styles.glassOverlay}>
                  <View style={styles.actionContent}>
                    <View style={styles.actionIconContainer}>
                      <ActionIcon action="compose" size={28} color={colors.text.primary} />
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text style={styles.actionTitle}>一句を詠む</Text>
                      <Text style={styles.actionDescription}>下の句を投稿する</Text>
                    </View>
                    <View style={styles.chevronContainer}>
                      <Text style={styles.chevron}>▸</Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* 作品を鑑賞 */}
            <TouchableOpacity
              onPress={handleAppreciate}
              activeOpacity={0.8}
              style={styles.secondCard}
            >
              <LinearGradient
                colors={[categoryColors.gradient[1], categoryColors.gradient[0]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.actionCard, { shadowColor: categoryColors.shadow }]}
              >
                <View style={styles.glassOverlay}>
                  <View style={styles.actionContent}>
                    <View style={styles.actionIconContainer}>
                      <ActionIcon action="appreciate" size={28} color={colors.text.primary} />
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text style={styles.actionTitle}>作品を鑑賞</Text>
                      <Text style={styles.actionDescription}>他の人の一句を楽しむ</Text>
                    </View>
                    <View style={styles.chevronContainer}>
                      <Text style={styles.chevron}>▸</Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
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
    width: 96,
    height: 96,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
    ...shadow.lg,
    overflow: 'hidden',
  },
  glassOverlaySmall: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
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
  secondCard: {
    marginTop: spacing.md,
  },
  actionCard: {
    borderRadius: borderRadius.lg,
    ...shadow.lg,
    overflow: 'hidden',
  },
  glassOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: spacing.lg,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
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
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  chevronContainer: {
    marginLeft: spacing.sm,
  },
  chevron: {
    fontSize: 24,
    color: colors.text.inverse,
    opacity: 0.6,
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
