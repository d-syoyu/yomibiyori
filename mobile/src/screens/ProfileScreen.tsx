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
  Switch,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useToastStore } from '../stores/useToastStore';
import { PrefecturePicker } from '../components/PrefecturePicker';
import { collectDeviceInfo, formatDeviceInfo } from '../utils/deviceInfo';
import api from '../services/api';
import type { UserProfile, DeviceInfo } from '../types';
import { colors, spacing, borderRadius, shadow, fontSize, fontFamily } from '../theme';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form fields
  const [displayName, setDisplayName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [prefecture, setPrefecture] = useState<string | undefined>();
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | undefined>();
  const [analyticsOptOut, setAnalyticsOptOut] = useState(false);

  const { showSuccess, showError } = useToastStore();

  useEffect(() => {
    loadProfile();
    loadDeviceInfo();
  }, []);

  async function loadProfile() {
    try {
      setIsLoading(true);
      const data = await api.getUserProfile();
      setProfile(data);

      // Initialize form fields with profile data
      setDisplayName(data.display_name || '');
      setBirthYear(data.birth_year ? String(data.birth_year) : '');
      setPrefecture(data.prefecture);
      setDeviceInfo(data.device_info);
      setAnalyticsOptOut(data.analytics_opt_out || false);
    } catch (error: any) {
      console.error('[Profile] Failed to load profile:', error);
      showError(error?.message || 'プロフィールの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadDeviceInfo() {
    try {
      const info = await collectDeviceInfo();
      setDeviceInfo(info);
    } catch (error) {
      console.error('[Profile] Failed to collect device info:', error);
    }
  }

  async function handleSave() {
    try {
      setIsSaving(true);

      // Validate birth year if provided
      let parsedBirthYear: number | undefined;
      if (birthYear.trim()) {
        parsedBirthYear = parseInt(birthYear, 10);
        if (isNaN(parsedBirthYear) || parsedBirthYear < 1900 || parsedBirthYear > 2025) {
          showError('生年は1900年から2025年の間で入力してください');
          return;
        }
      }

      const updateData = {
        display_name: displayName.trim() || undefined,
        birth_year: parsedBirthYear,
        prefecture,
        device_info: deviceInfo,
        analytics_opt_out: analyticsOptOut,
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
            <TextInput
              style={styles.input}
              value={birthYear}
              onChangeText={setBirthYear}
              placeholder="例: 1990"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              maxLength={4}
            />
            <Text style={styles.helpText}>より良い体験のため、生まれた年を教えてください</Text>
          </View>

          {/* Prefecture */}
          <View style={styles.section}>
            <PrefecturePicker value={prefecture} onChange={setPrefecture} label="都道府県（任意）" />
            <Text style={styles.helpText}>地域に関連したコンテンツ提供のため</Text>
          </View>

          {/* Device Info (read-only) */}
          <View style={styles.section}>
            <Text style={styles.label}>デバイス情報</Text>
            <View style={[styles.input, styles.readOnlyInput]}>
              <Text style={styles.readOnlyText}>{formatDeviceInfo(deviceInfo)}</Text>
            </View>
            <Text style={styles.helpText}>※自動的に収集されます</Text>
          </View>

          {/* Analytics Opt-out */}
          <View style={styles.section}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={styles.label}>分析データの収集</Text>
                <Text style={styles.helpText}>
                  オフにすると、利用状況の分析データ収集を停止します
                </Text>
              </View>
              <Switch
                value={!analyticsOptOut}
                onValueChange={(value) => setAnalyticsOptOut(!value)}
                trackColor={{ false: colors.disabled, true: colors.primary }}
                thumbColor={Platform.OS === 'android' ? colors.surface : undefined}
              />
            </View>
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

          {/* Privacy Note */}
          <View style={styles.privacyNote}>
            <Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.privacyText}>
              収集したデータはサービス改善のみに使用され、第三者に共有されることはありません
            </Text>
          </View>
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    flex: 1,
    marginRight: spacing.md,
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
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  privacyText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    fontFamily: fontFamily.regular,
  },
});
