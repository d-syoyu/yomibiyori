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
          <ActivityIndicator size="large" color={colors.primary} />
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
            <PrefecturePicker value={prefecture} onChange={setPrefecture} label="都道府県（任意）" />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.surface} />
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
    backgroundColor: colors.background,
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
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontFamily: fontFamily.regular,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontFamily: fontFamily.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontFamily: fontFamily.regular,
  },
  section: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.surface,
    fontFamily: fontFamily.regular,
  },
  readOnlyInput: {
    backgroundColor: colors.backgroundSecondary,
  },
  readOnlyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontFamily: fontFamily.regular,
  },
  helpText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontFamily: fontFamily.regular,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  picker: {
    ...Platform.select({
      ios: {
        height: 180,
      },
      android: {
        height: 50,
      },
    }),
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
    ...shadow.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    color: colors.surface,
  },
});
