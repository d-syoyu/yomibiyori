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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { useToastStore } from '../stores/useToastStore';
import { useAuthStore } from '../stores/useAuthStore';
import { PrefecturePicker } from '../components/PrefecturePicker';
import api from '../services/api';
import type { UserProfile } from '../types';
import { colors, spacing, borderRadius, shadow, fontSize, fontFamily } from '../theme';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const logout = useAuthStore(state => state.logout);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

      // Validate display name
      if (!displayName.trim()) {
        showError('表示名を入力してください');
        setIsSaving(false);
        return;
      }

      const updateData = {
        display_name: displayName.trim(),
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

  function handleDeleteAccount() {
    Alert.alert(
      'アカウント削除の確認',
      'アカウントを削除すると、すべてのデータ（投稿した作品、いいね、フォローなど）が完全に削除されます。この操作は取り消せません。\n\n本当に削除しますか？',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '削除する',
          style: 'destructive',
          onPress: confirmDeleteAccount,
        },
      ]
    );
  }

  async function confirmDeleteAccount() {
    try {
      setIsDeleting(true);
      await api.deleteAccount();
      showSuccess('アカウントを削除しました');

      // Logout and clear session
      await logout();

      // Navigate back to login
      navigation.goBack();
    } catch (error: any) {
      console.error('[Profile] Failed to delete account:', error);
      showError(error?.message || 'アカウントの削除に失敗しました');
    } finally {
      setIsDeleting(false);
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
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
            <Text style={styles.label}>生年</Text>
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
            <Text style={styles.label}>都道府県</Text>
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

          {/* Danger Zone */}
          <View style={styles.dangerZone}>
            <Text style={styles.dangerZoneTitle}>危険な操作</Text>
            <Text style={styles.dangerZoneDescription}>
              アカウントを削除すると、すべてのデータが完全に削除されます。
            </Text>
            <TouchableOpacity
              style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
              onPress={handleDeleteAccount}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator color={colors.status.error} />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={20} color={colors.status.error} />
                  <Text style={styles.deleteButtonText}>アカウントを削除</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
    paddingBottom: spacing.xxl * 2, // Extra padding at bottom to prevent content overlap
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
    justifyContent: 'center',
    minHeight: 56,
  },
  picker: {
    height: Platform.select({ ios: 180, android: 56 }),
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.xl,
    marginBottom: spacing.md, // Add margin to prevent overlap
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
  dangerZone: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    marginBottom: spacing.xl, // Add bottom margin for spacing
    borderTopWidth: 1,
    borderTopColor: 'rgba(229, 62, 62, 0.2)',
  },
  dangerZoneTitle: {
    fontSize: fontSize.h3,
    fontFamily: fontFamily.semiBold,
    color: colors.status.error,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  dangerZoneDescription: {
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.regular,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    letterSpacing: 0.3,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(229, 62, 62, 0.1)',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.status.error,
    gap: spacing.sm,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    color: colors.status.error,
    letterSpacing: 0.5,
  },
});
