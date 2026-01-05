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
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../types';
import api from '../services/api';
import VerticalText from '../components/VerticalText';
import WorkCard from '../components/WorkCard';
import { useAuthStore } from '../stores/useAuthStore';
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
  const displayName = useAuthStore((state) => state.user?.display_name ?? 'あなた');
  const profileImageUrl = useAuthStore((state) => state.user?.profile_image_url);

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
        text: `${line1.trim()} \n${line2.trim()} `,
      });

      console.log('[CompositionScreen] Work created successfully', { work_id: work.id });

      // Note: work_created event is tracked by backend API to avoid duplicate events
      // The backend ensures the event is only sent after successful DB insertion

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
              <View
                style={[
                  styles.themeCard,
                  { borderTopColor: colors.category[theme.category].primary },
                ]}
              >
                {theme.sponsored && theme.sponsor_company_name && (
                  <View style={styles.sponsorBadge}>
                    <Text style={styles.sponsorBadgeText}>スポンサー提供</Text>
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
                  <TouchableOpacity
                    style={[
                      styles.sponsorLinkButton,
                      !theme.sponsor_official_url && styles.sponsorLinkButtonDisabled,
                    ]}
                    onPress={() => {
                      if (theme.sponsor_official_url) {
                        trackEvent(EventNames.SPONSOR_LINK_CLICKED, {
                          theme_id: theme.id,
                          sponsor_name: theme.sponsor_company_name,
                          url: theme.sponsor_official_url,
                        });
                        Linking.openURL(theme.sponsor_official_url);
                      }
                    }}
                    disabled={!theme.sponsor_official_url}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.sponsorLinkButtonText,
                        !theme.sponsor_official_url && styles.sponsorLinkButtonTextDisabled,
                      ]}
                    >
                      {theme.sponsor_company_name}
                    </Text>
                    {theme.sponsor_official_url && (
                      <Ionicons name="open-outline" size={16} color={colors.text.primary} />
                    )}
                  </TouchableOpacity>
                )}
              </View>
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
            {(line1.trim() || line2.trim()) && theme && (
              <View style={styles.previewSection}>
                <Text style={styles.previewLabel}>プレビュー</Text>
                <WorkCard
                  upperText={theme.text}
                  lowerText={`${line1.trim()}\n${line2.trim()}`}
                  category={theme.category}
                  displayName={displayName}
                  profileImageUrl={profileImageUrl}
                  sponsorName={theme.sponsored ? theme.sponsor_company_name : undefined}
                  sponsorUrl={theme.sponsored ? theme.sponsor_official_url : undefined}
                  customActions={<View />}
                />
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
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderTopWidth: 4,
    // WorkCardと同じ影のスタイル
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sponsorBadge: {
    backgroundColor: colors.background.secondary,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  sponsorBadgeText: {
    fontSize: 11,
    fontFamily: fontFamily.medium,
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  themeLabel: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.medium,
    color: colors.text.tertiary,
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
  sponsorLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.secondary,
    borderWidth: 1.5,
    borderColor: colors.text.primary,
    marginTop: spacing.md,
  },
  sponsorLinkButtonDisabled: {
    backgroundColor: colors.background.secondary,
    borderColor: colors.text.tertiary,
  },
  sponsorLinkButtonText: {
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    letterSpacing: 0.3,
  },
  sponsorLinkButtonTextDisabled: {
    color: colors.text.tertiary,
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
});
