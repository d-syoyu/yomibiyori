/**
 * Profile Edit Screen
 * プロフィール編集画面
 */

import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useToastStore } from '../stores/useToastStore';
import { PrefecturePicker } from '../components/PrefecturePicker';
import api from '../services/api';
import type { UserProfile } from '../types';
import { colors, spacing, borderRadius, shadow, fontSize, fontFamily } from '../theme';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form fields
  const [displayName, setDisplayName] = useState('');
  const [birthYear, setBirthYear] = useState<number | undefined>();
  const [prefecture, setPrefecture] = useState<string | undefined>();

  const { showSuccess, showError } = useToastStore();

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setIsLoading(true);
      const data = await api.getUserProfile();
      setProfile(data);

      // Initialize form fields with profile data
      setDisplayName(data.display_name || '');
      setBirthYear(data.birth_year);
      setPrefecture(data.prefecture);
    } catch (error: any) {
      console.error('[Profile] Failed to load profile:', error);
      showError(error?.message || 'プロフィールの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    try {
      setIsSaving(true);

      const updateData = {
        display_name: displayName.trim() || undefined,
        birth_year: birthYear,
        prefecture,
      };

      const updated = await api.updateProfile(updateData);
      setProfile(updated);

      showSuccess('プロフィールを更新しました');
    } catch (error: any) {
      console.error('[Profile] Failed to update profile:', error);
      showError(error?.message || 'プロフィールの更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text.primary} />
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>プロフィール設定</Text>
            <Text style={styles.subtitle}>基本情報や設定を変更できます</Text>
          </View>

          {/* Display Name */}
          <View style={styles.section}>
            <Text style={styles.label}>表示名</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="例: 太郎"
              placeholderTextColor={colors.textSecondary}
              maxLength={80}
            />
          </View>

          {/* Email (read-only) */}
          <View style={styles.section}>
            <Text style={styles.label}>メールアドレス</Text>
            <View style={[styles.input, styles.readOnlyInput]}>
              <Text style={styles.readOnlyText}>{profile?.email}</Text>
            </View>
            <Text style={styles.helpText}>※メールアドレスは変更できません</Text>
          </View>

          {/* Birth Year */}
          <View style={styles.section}>
            <Text style={styles.label}>生年（任意）</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={birthYear}
                onValueChange={(itemValue) => setBirthYear(itemValue === 0 ? undefined : itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="選択してください" value={0} />
                {Array.from({ length: 126 }, (_, i) => {
                  const year = 2025 - i;
                  return <Picker.Item key={year} label={`${year}年`} value={year} />;
                })}
              </Picker>
            </View>
          </View>

          {/* Prefecture */}
          <View style={styles.section}>
            <Text style={styles.label}>都道府県（任意）</Text>
            <PrefecturePicker value={prefecture} onChange={setPrefecture} pickerStyle={styles.pickerContainer} />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.text.inverse} />
                <Text style={styles.saveButtonText}>保存する</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  flex: {
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.h1,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    fontFamily: fontFamily.regular,
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(107, 123, 79, 0.2)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.body,
    color: colors.text.primary,
    backgroundColor: colors.background.card,
    fontFamily: fontFamily.regular,
  },
  readOnlyInput: {
    backgroundColor: colors.background.secondary,
  },
  readOnlyText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    fontFamily: fontFamily.regular,
  },
  helpText: {
    fontSize: fontSize.bodySmall,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    fontFamily: fontFamily.regular,
    letterSpacing: 0.3,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: 'rgba(107, 123, 79, 0.2)',
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.card,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.xl,
    gap: spacing.sm,
    ...shadow.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    color: colors.text.inverse,
    letterSpacing: 0.5,
  },
});
