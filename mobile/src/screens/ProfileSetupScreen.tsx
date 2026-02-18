/**
 * Profile Setup Screen
 * ステップ形式のプロフィール設定画面
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useToastStore } from '../stores/useToastStore';
import { PrefecturePicker } from '../components/PrefecturePicker';
import api from '../services/api';
import type { UserProfile, GenderType, MyPoemsStackParamList } from '../types';
import { colors, spacing, borderRadius, shadow, fontSize, fontFamily } from '../theme';

type ProfileSetupNavigationProp = NativeStackNavigationProp<MyPoemsStackParamList, 'ProfileSetup'>;

// Steps configuration
const STEPS = [
  { key: 'displayName', title: '表示名', subtitle: 'あなたのお名前を教えてください', required: true },
  { key: 'birthYear', title: '生年', subtitle: '生まれた年を教えてください', required: false },
  { key: 'gender', title: '性別', subtitle: '性別を教えてください', required: false },
  { key: 'prefecture', title: 'お住まいの地域', subtitle: 'お住まいの都道府県を教えてください', required: false },
] as const;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProfileSetupScreen() {
  const navigation = useNavigation<ProfileSetupNavigationProp>();
  const { showSuccess, showError } = useToastStore();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Form fields
  const [displayName, setDisplayName] = useState('');
  const [birthYear, setBirthYear] = useState<number | undefined>();
  const [gender, setGender] = useState<GenderType | undefined>();
  const [prefecture, setPrefecture] = useState<string | undefined>();

  // Animation
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setIsLoading(true);
      const data = await api.getUserProfile();
      setProfile(data);
      setDisplayName(data.display_name || '');
      setBirthYear(data.birth_year);
      setGender(data.gender);
      setPrefecture(data.prefecture);
    } catch (error: any) {
      showError(error?.message || 'プロフィールの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  }

  const animateStepChange = (direction: 'next' | 'prev', callback: () => void) => {
    const toValue = direction === 'next' ? -SCREEN_WIDTH : SCREEN_WIDTH;

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
      slideAnim.setValue(direction === 'next' ? SCREEN_WIDTH : -SCREEN_WIDTH);

      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleNext = () => {
    // Validate current step if required
    if (currentStep === 0 && !displayName.trim()) {
      showError('表示名を入力してください');
      return;
    }

    if (currentStep < STEPS.length - 1) {
      animateStepChange('next', () => setCurrentStep(currentStep + 1));
    } else {
      handleSave();
    }
  };

  const handleSkip = () => {
    if (currentStep < STEPS.length - 1) {
      animateStepChange('next', () => setCurrentStep(currentStep + 1));
    } else {
      handleSave();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      animateStepChange('prev', () => setCurrentStep(currentStep - 1));
    } else {
      navigation.goBack();
    }
  };

  async function handleSave() {
    try {
      setIsSaving(true);

      const updateData = {
        display_name: displayName.trim(),
        birth_year: birthYear,
        gender,
        prefecture,
      };

      await api.updateProfile(updateData);
      showSuccess('プロフィールを更新しました');
      // ステップ完了後は従来のプロフィール設定画面に遷移
      navigation.replace('Profile');
    } catch (error: any) {
      showError(error?.message || 'プロフィールの更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  }

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {STEPS.map((_, index) => (
        <View
          key={index}
          style={[
            styles.stepDot,
            index === currentStep && styles.stepDotActive,
            index < currentStep && styles.stepDotCompleted,
          ]}
        />
      ))}
    </View>
  );

  const renderStepContent = () => {
    const step = STEPS[currentStep];

    switch (step.key) {
      case 'displayName':
        return (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="例: 太郎"
              placeholderTextColor={colors.text.tertiary}
              maxLength={80}
              autoFocus
              returnKeyType="next"
              onSubmitEditing={handleNext}
            />
            <Text style={styles.inputHint}>他のユーザーに表示される名前です</Text>
          </View>
        );

      case 'birthYear':
        return (
          <View style={styles.inputContainer}>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={birthYear ?? 0}
                onValueChange={(value) => setBirthYear(value === 0 ? undefined : value)}
                style={styles.picker}
                itemStyle={styles.pickerItem}
                dropdownIconColor={colors.text.secondary}
              >
                <Picker.Item label="選択してください" value={0} />
                {Array.from({ length: 126 }, (_, i) => {
                  const year = 2025 - i;
                  return <Picker.Item key={year} label={`${year}年`} value={year} />;
                })}
              </Picker>
            </View>
            <Text style={styles.inputHint}>※他のユーザーには表示されません</Text>
          </View>
        );

      case 'gender':
        return (
          <View style={styles.inputContainer}>
            <View style={styles.genderButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  gender === 'male' && styles.genderButtonSelected,
                ]}
                onPress={() => setGender('male')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="male"
                  size={32}
                  color={gender === 'male' ? colors.text.inverse : colors.text.secondary}
                />
                <Text
                  style={[
                    styles.genderButtonText,
                    gender === 'male' && styles.genderButtonTextSelected,
                  ]}
                >
                  男性
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.genderButton,
                  gender === 'female' && styles.genderButtonSelected,
                ]}
                onPress={() => setGender('female')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="female"
                  size={32}
                  color={gender === 'female' ? colors.text.inverse : colors.text.secondary}
                />
                <Text
                  style={[
                    styles.genderButtonText,
                    gender === 'female' && styles.genderButtonTextSelected,
                  ]}
                >
                  女性
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.genderButton,
                  gender === 'other' && styles.genderButtonSelected,
                ]}
                onPress={() => setGender('other')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="person"
                  size={32}
                  color={gender === 'other' ? colors.text.inverse : colors.text.secondary}
                />
                <Text
                  style={[
                    styles.genderButtonText,
                    gender === 'other' && styles.genderButtonTextSelected,
                  ]}
                >
                  その他
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.inputHint}>※他のユーザーには表示されません</Text>
          </View>
        );

      case 'prefecture':
        return (
          <View style={styles.inputContainer}>
            <PrefecturePicker
              value={prefecture}
              onChange={setPrefecture}
              pickerStyle={styles.pickerContainer}
            />
            <Text style={styles.inputHint}>※他のユーザーには表示されません</Text>
          </View>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text.primary} />
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentStepData = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;
  const canSkip = !currentStepData.required;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          {renderStepIndicator()}
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.stepContent,
              {
                transform: [{ translateX: slideAnim }],
                opacity: fadeAnim,
              },
            ]}
          >
            <Text style={styles.stepTitle}>{currentStepData.title}</Text>
            <Text style={styles.stepSubtitle}>{currentStepData.subtitle}</Text>
            {renderStepContent()}
          </Animated.View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {canSkip && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              disabled={isSaving}
            >
              <Text style={styles.skipButtonText}>スキップ</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.nextButton,
              !canSkip && styles.nextButtonFull,
              isSaving && styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <>
                <Text style={styles.nextButtonText}>
                  {isLastStep ? '完了' : '次へ'}
                </Text>
                {!isLastStep && (
                  <Ionicons name="chevron-forward" size={20} color={colors.text.inverse} />
                )}
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.body,
    color: colors.text.tertiary,
    fontFamily: fontFamily.regular,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerSpacer: {
    width: 40,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.background.secondary,
  },
  stepDotActive: {
    width: 24,
    backgroundColor: colors.text.primary,
  },
  stepDotCompleted: {
    backgroundColor: colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: fontSize.h1,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    letterSpacing: 1,
  },
  stepSubtitle: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    color: colors.text.secondary,
    marginBottom: spacing.xxl,
    letterSpacing: 0.5,
    lineHeight: 24,
  },
  inputContainer: {
    marginTop: spacing.md,
  },
  textInput: {
    borderWidth: 1,
    borderColor: 'rgba(107, 123, 79, 0.3)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    fontSize: fontSize.h3,
    color: colors.text.primary,
    backgroundColor: colors.background.card,
    fontFamily: fontFamily.regular,
  },
  inputHint: {
    marginTop: spacing.sm,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.regular,
    color: colors.text.tertiary,
    letterSpacing: 0.3,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: 'rgba(107, 123, 79, 0.3)',
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.card,
    overflow: 'hidden',
  },
  picker: {
    height: Platform.select({ ios: 180, android: 56 }),
    color: colors.text.primary,
  },
  pickerItem: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    color: colors.text.primary,
  },
  genderButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  genderButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: 'rgba(107, 123, 79, 0.3)',
    backgroundColor: colors.background.card,
    ...shadow.sm,
  },
  genderButtonSelected: {
    backgroundColor: colors.text.primary,
    borderColor: colors.text.primary,
  },
  genderButtonText: {
    marginTop: spacing.sm,
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  genderButtonTextSelected: {
    color: colors.text.inverse,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: Platform.select({ ios: spacing.lg, android: spacing.xl }),
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.background.secondary,
    backgroundColor: colors.background.primary,
  },
  skipButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(107, 123, 79, 0.3)',
    backgroundColor: colors.background.card,
  },
  skipButtonText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.text.primary,
    gap: spacing.xs,
    ...shadow.md,
  },
  nextButtonFull: {
    flex: 2,
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    color: colors.text.inverse,
    letterSpacing: 0.5,
  },
});
