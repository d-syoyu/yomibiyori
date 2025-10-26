/**
 * Composition Screen
 * 詠み作成画面 - 俳句を作成する
 */

import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../types';
import api from '../services/api';
import VerticalText from '../components/VerticalText';
import { colors, spacing, borderRadius, shadow, fontSize, fontFamily } from '../theme';
import { useToastStore } from '../stores/useToastStore';
import { useApiErrorHandler } from '../hooks/useApiErrorHandler';
import { VALIDATION_MESSAGES, SUCCESS_MESSAGES } from '../constants/errorMessages';

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

  const handleSubmit = async () => {
    if (!line1.trim() || !line2.trim()) {
      showError(VALIDATION_MESSAGES.composition.emptyLines);
      return;
    }

    if (!theme) {
      showError(VALIDATION_MESSAGES.composition.noTheme);
      return;
    }

    setIsSubmitting(true);
    try {
      // APIに作品を投稿（改行で結合）
      await api.createWork({
        theme_id: theme.id,
        text: `${line1.trim()}\n${line2.trim()}`,
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
      handleError(error, 'work_creation');
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
                  <Text style={styles.themeLabel}>今日のお題（上の句）</Text>
                  <View style={styles.verticalTextContainer}>
                    <VerticalText
                      text={theme.text}
                      textStyle={styles.themeVerticalText}
                      direction="rtl"
                    />
                  </View>
                  <Text style={styles.themeCategory}>{theme.category}</Text>
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
                      direction="ltr"
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
    minHeight: 120,
    marginVertical: spacing.md,
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
