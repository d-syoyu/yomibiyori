/**
 * Composition Screen
 * 詠み作成画面 - 俳句を作成する
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../types';
import api from '../services/api';
import VerticalText from '../components/VerticalText';
import { colors, spacing, borderRadius, shadow, fontSize, fontFamily } from '../theme';
import { useToastStore } from '../stores/useToastStore';
import { useApiErrorHandler } from '../hooks/useApiErrorHandler';
import { VALIDATION_MESSAGES, SUCCESS_MESSAGES } from '../constants/errorMessages';
import { trackEvent, EventNames } from '../utils/analytics';

type Props = NativeStackScreenProps<HomeStackParamList, 'Composition'>;
type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

export default function CompositionScreen({ route }: Props) {
  const navigation = useNavigation<NavigationProp>();
  const showSuccess = useToastStore((state) => state.showSuccess);
  const showError = useToastStore((state) => state.showError);
  const { handleError } = useApiErrorHandler();

  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const theme = route.params?.theme;

  useFocusEffect(
    useCallback(() => {
      trackEvent(EventNames.SCREEN_VIEWED, {
        screen_name: 'Composition',
        category: theme?.category,
      });

      // お題が表示された時点でtheme_viewedイベントを送信
      if (theme?.id) {
        trackEvent(EventNames.THEME_VIEWED, {
          theme_id: theme.id,
          category: theme.category,
        });
      }
    }, [theme?.category, theme?.id])
  );

  const handleSubmit = async () => {
    console.log('[CompositionScreen] handleSubmit called');

    // 入力バリデーション
    if (!line1.trim() || !line2.trim()) {
      console.log('[CompositionScreen] Validation failed: empty lines');
      showError(VALIDATION_MESSAGES.composition.emptyLines);
      return;
    }

    if (!theme) {
      console.log('[CompositionScreen] Validation failed: no theme');
      showError(VALIDATION_MESSAGES.composition.noTheme);
      return;
    }

    console.log('[CompositionScreen] Starting work submission', {
      theme_id: theme.id,
      category: theme.category,
      text_length: line1.trim().length + line2.trim().length + 1,
    });

    setIsSubmitting(true);
    try {
      // APIに作品を投稿（改行で結合）
      const work = await api.createWork({
        theme_id: theme.id,
        text: `${line1.trim()}\n${line2.trim()}`,
      });

      console.log('[CompositionScreen] Work created successfully', { work_id: work.id });

      // Track work creation event
      trackEvent(EventNames.WORK_CREATED, {
        theme_id: theme.id,
        category: theme.category,
        work_id: work.id,
      });

      // 投稿成功
      showSuccess(SUCCESS_MESSAGES.workCreated);

      // Clear input
      setLine1('');
      setLine2('');

      // Navigate to appreciation screen after a short delay
      setTimeout(() => {
        navigation.navigate('Appreciation', { category: theme.category });
      }, 1500);
    } catch (error: any) {
      console.error('[CompositionScreen] Work creation failed:', error);
      try {
        handleError(error, 'work_creation');
      } catch (handlerError) {
        console.error('[CompositionScreen] Error handler failed:', handlerError);
        // エラーハンドラーが失敗した場合のフォールバック
        try {
          showError('投稿に失敗しました\nもう一度お試しください');
        } catch (fallbackError) {
          console.error('[CompositionScreen] Fallback error display failed:', fallbackError);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <Text style={styles.title}>詠む</Text>

            {theme ? (
              <LinearGradient
                colors={[
                  colors.category[theme.category].gradient[0],
                  colors.category[theme.category].gradient[1],
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.themeCard,
                  { shadowColor: colors.category[theme.category].shadow },
                ]}
              >
                <View style={styles.glassOverlay}>
                  {theme.sponsored && theme.sponsor_company_name && (
                    <View style={styles.sponsorBadge}>
                      <Text style={styles.sponsorBadgeText}>
                        スポンサー提供
                      </Text>
                    </View>
                  )}
                  <Text style={styles.themeLabel}>今日のお題（上の句）</Text>
                  <View style={styles.verticalTextContainer}>
                    <VerticalText
                      text={theme.text}
                      textStyle={styles.themeVerticalText}
                      direction="rtl"
                    />
                  </View>
                  <Text style={styles.themeCategory}>{theme.category}</Text>
                  {theme.sponsored && theme.sponsor_company_name && (
                    <Text style={styles.sponsorInfo}>
                      {theme.sponsor_company_name}
                    </Text>
                  )}
                </View>
              </LinearGradient>
            ) : (
              <View style={styles.noThemeCard}>
                <Text style={styles.noThemeText}>
                  お題を選択してください
                </Text>
              </View>
            )}

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>下の句（第一句：7音）</Text>
              <TextInput
                style={styles.textInput}
                placeholder="7音で入力してください"
                value={line1}
                onChangeText={setLine1}
                multiline={true}
                maxLength={20}
                editable={!!theme}
              />
              <Text style={styles.charCount}>{line1.length} / 20</Text>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>下の句（第二句：7音）</Text>
              <TextInput
                style={styles.textInput}
                placeholder="7音で入力してください"
                value={line2}
                onChangeText={setLine2}
                multiline={true}
                maxLength={20}
                editable={!!theme}
              />
              <Text style={styles.charCount}>{line2.length} / 20</Text>
            </View>

            {/* プレビュー表示 */}
            {(line1.trim() || line2.trim()) && (
              <View style={styles.previewSection}>
                <Text style={styles.previewLabel}>プレビュー</Text>
                <LinearGradient
                  colors={['#FFFFFF', colors.background.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.previewCard}
                >
                  {/* お題（上の句） */}
                  {theme && (
                    <View style={styles.previewTheme}>
                      <Text style={styles.previewThemeLabel}>お題</Text>
                      <View style={styles.verticalTextContainer}>
                        <VerticalText
                          text={theme.text}
                          textStyle={styles.previewThemeText}
                          direction="rtl"
                        />
                      </View>
                    </View>
                  )}

                  {/* 下の句 */}
                  {(line1.trim() || line2.trim()) && (
                    <View style={styles.previewWork}>
                      <Text style={styles.previewWorkLabel}>下の句</Text>
                      <View style={styles.verticalTextContainer}>
                        <VerticalText
                          text={`${line1}\n${line2}`}
                          textStyle={styles.previewWorkText}
                          direction="rtl"
                        />
                      </View>
                    </View>
                  )}
                </LinearGradient>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.submitButton,
                (!theme || isSubmitting || !line1.trim() || !line2.trim()) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!theme || isSubmitting || !line1.trim() || !line2.trim()}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  !theme || isSubmitting || !line1.trim() || !line2.trim()
                    ? ['#CBD5E0', '#A0AEC0']
                    : [colors.text.primary, colors.text.secondary]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButtonGradient}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? '投稿中...' : '投稿する'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.h1,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.xl,
    letterSpacing: 2,
    textAlign: 'center',
  },
  themeCard: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
    ...shadow.lg,
    overflow: 'hidden',
  },
  glassOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: spacing.lg,
  },
  sponsorBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    ...shadow.sm,
  },
  sponsorBadgeText: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  themeLabel: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.medium,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    letterSpacing: 1,
    textAlign: 'center',
  },
  verticalTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
  },
  themeVerticalText: {
    fontSize: fontSize.poem,
    lineHeight: 34,
    color: colors.text.primary,
    fontFamily: fontFamily.medium,
  },
  themeCategory: {
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.medium,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    letterSpacing: 2,
  },
  sponsorInfo: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.medium,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  noThemeCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    marginBottom: spacing.xl,
    alignItems: 'center',
    ...shadow.sm,
  },
  noThemeText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    color: colors.text.tertiary,
    letterSpacing: 0.5,
  },
  inputSection: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    color: colors.text.primary,
    minHeight: 60,
    textAlignVertical: 'top',
    ...shadow.sm,
  },
  charCount: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.regular,
    color: colors.text.tertiary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  submitButton: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadow.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  submitButtonText: {
    color: colors.text.inverse,
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    letterSpacing: 1,
  },
  previewSection: {
    marginBottom: spacing.xl,
  },
  previewLabel: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.md,
    letterSpacing: 0.5,
  },
  previewCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadow.md,
    overflow: 'hidden',
  },
  previewTheme: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(107, 123, 79, 0.2)',
  },
  previewThemeLabel: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.medium,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  previewThemeText: {
    fontSize: fontSize.body,
    lineHeight: 28,
    color: colors.text.secondary,
    fontFamily: fontFamily.regular,
  },
  previewWork: {
    marginBottom: spacing.sm,
  },
  previewWorkLabel: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.medium,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  previewWorkText: {
    fontSize: fontSize.body,
    lineHeight: 28,
    color: colors.text.primary,
    fontFamily: fontFamily.regular,
  },
});
