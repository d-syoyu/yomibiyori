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
  Switch,
  Image,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
  type FlexAlignType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useToastStore } from '../stores/useToastStore';
import { useAuthStore } from '../stores/useAuthStore';
import { PrefecturePicker } from '../components/PrefecturePicker';
import CircularCropModal from '../components/CircularCropModal';
import api from '../services/api';
import type { UserProfile, GenderType } from '../types';
import { colors, spacing, borderRadius, shadow, fontSize, fontFamily } from '../theme';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const logout = useAuthStore(state => state.logout);
  const refreshProfile = useAuthStore(state => state.refreshProfile);
  const { width, height } = useWindowDimensions();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Form fields
  const [displayName, setDisplayName] = useState('');
  const [birthYear, setBirthYear] = useState<number | undefined>();
  const [gender, setGender] = useState<GenderType | undefined>();
  const [prefecture, setPrefecture] = useState<string | undefined>();
  const [themeNotificationEnabled, setThemeNotificationEnabled] = useState(true);
  const [rankingNotificationEnabled, setRankingNotificationEnabled] = useState(true);
  const [profileImageUrl, setProfileImageUrl] = useState<string | undefined>();
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  const { showSuccess, showError } = useToastStore();

  // デバイスサイズの判定（タブレット: 幅が768px以上）
  const isTablet = width >= 768;
  const isLandscape = width > height;

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    console.log('[ProfileScreen] Loading profile');
    try {
      setIsLoading(true);
      const data = await api.getUserProfile();
      setProfile(data);

      console.log('[ProfileScreen] Profile loaded successfully');

      // Initialize form fields with profile data
      setDisplayName(data.display_name || '');
      setBirthYear(data.birth_year);
      setGender(data.gender);
      setPrefecture(data.prefecture);
      setThemeNotificationEnabled(
        data.notify_theme_release ?? true,
      );
      setRankingNotificationEnabled(
        data.notify_ranking_result ?? true,
      );
      setProfileImageUrl(data.profile_image_url);
    } catch (error: any) {
      console.error('[ProfileScreen] Failed to load profile:', error);
      try {
        showError(error?.message || 'プロフィールの読み込みに失敗しました');
      } catch (toastError) {
        console.error('[ProfileScreen] Failed to show error toast:', toastError);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    console.log('[ProfileScreen] Saving profile');
    try {
      setIsSaving(true);

      // Validate display name
      if (!displayName.trim()) {
        console.log('[ProfileScreen] Validation failed: empty display name');
        showError('表示名を入力してください');
        setIsSaving(false);
        return;
      }

      const updateData = {
        display_name: displayName.trim(),
        birth_year: birthYear,
        gender,
        prefecture,
        notify_theme_release: themeNotificationEnabled,
        notify_ranking_result: rankingNotificationEnabled,
      };

      console.log('[ProfileScreen] Updating profile with data:', updateData);

      const updated = await api.updateProfile(updateData);
      setProfile(updated);

      console.log('[ProfileScreen] Profile updated successfully');

      showSuccess('プロフィールを更新しました');
    } catch (error: any) {
      console.error('[ProfileScreen] Failed to update profile:', error);
      try {
        showError(error?.message || 'プロフィールの更新に失敗しました');
      } catch (toastError) {
        console.error('[ProfileScreen] Failed to show error toast:', toastError);
      }
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
    console.log('[ProfileScreen] Deleting account');
    try {
      setIsDeleting(true);
      await api.deleteAccount();

      console.log('[ProfileScreen] Account deleted successfully');

      showSuccess('アカウントを削除しました');

      // Logout and clear session
      try {
        await logout();
      } catch (logoutError) {
        console.error('[ProfileScreen] Logout failed after account deletion:', logoutError);
      }

      // Navigate back if possible, otherwise user will be redirected to login by auth state
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (error: any) {
      console.error('[ProfileScreen] Failed to delete account:', error);
      try {
        showError(error?.message || 'アカウントの削除に失敗しました');
      } catch (toastError) {
        console.error('[ProfileScreen] Failed to show error toast:', toastError);
      }
    } finally {
      setIsDeleting(false);
    }
  }

  async function handlePickImage() {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showError('写真へのアクセス許可が必要です');
        return;
      }

      // Launch image picker with native square crop
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      // Show circular preview before uploading
      setSelectedImageUri(result.assets[0].uri);
      setCropModalVisible(true);
    } catch (error: any) {
      console.error('[ProfileScreen] Failed to pick image:', error);
      showError(error?.message || '画像の選択に失敗しました');
    }
  }

  async function handleCropConfirm() {
    if (!selectedImageUri) return;
    setCropModalVisible(false);
    try {
      setIsUploadingAvatar(true);

      const formData = new FormData();
      const filename = selectedImageUri.split('/').pop() || 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', {
        uri: selectedImageUri,
        name: filename,
        type,
      } as any);

      const response = await api.uploadAvatar(formData);
      console.log('[ProfileScreen] Upload response:', JSON.stringify(response));
      console.log('[ProfileScreen] profile_image_url:', response.profile_image_url);
      setProfileImageUrl(response.profile_image_url);
      // Refresh auth store to update user profile across the app
      await refreshProfile();
      showSuccess('プロフィール画像を更新しました');
    } catch (error: any) {
      console.error('[ProfileScreen] Failed to upload avatar:', error);
      showError(error?.message || 'プロフィール画像のアップロードに失敗しました');
    } finally {
      setIsUploadingAvatar(false);
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

  // 動的なコンテンツスタイル
  const responsiveScrollContentStyle: ViewStyle = {
    paddingHorizontal: isTablet ? spacing.xl * 2 : spacing.lg,
    paddingBottom: isTablet ? spacing.xxl * 4 : spacing.xxl * 2,
    maxWidth: isTablet ? 600 : undefined,
    alignSelf: isTablet ? ('center' as FlexAlignType) : undefined,
    width: isTablet ? '100%' : undefined,
  };

  const scrollContentStyle: StyleProp<ViewStyle> = [
    styles.scrollContent,
    responsiveScrollContentStyle,
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={scrollContentStyle}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>プロフィール設定</Text>
            <Text style={styles.subtitle}>基本情報や設定を変更できます</Text>
          </View>

          {/* Profile Image */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={handlePickImage}
              disabled={isUploadingAvatar}
              activeOpacity={0.7}
            >
              {profileImageUrl ? (
                <Image
                  source={{ uri: profileImageUrl, cache: 'reload' }}
                  style={styles.avatar}
                  key={profileImageUrl}
                  onError={(e) => console.error('[ProfileScreen] Image load error:', e.nativeEvent.error, 'URL:', profileImageUrl)}
                  onLoad={() => console.log('[ProfileScreen] Image loaded successfully:', profileImageUrl)}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={40} color={colors.text.tertiary} />
                </View>
              )}
              {isUploadingAvatar ? (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color={colors.text.inverse} />
                </View>
              ) : (
                <View style={styles.avatarEditBadge}>
                  <Ionicons name="camera" size={14} color={colors.text.inverse} />
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.avatarHint}>タップして画像を変更</Text>
          </View>

          {/* Display Name */}
          <View style={styles.section}>
            <Text style={styles.label}>表示名</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="例: 太郎"
              placeholderTextColor={colors.text.secondary}
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
                style={[styles.picker, styles.pickerText]}
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
            <Text style={styles.helpText}>※他のユーザーには表示されません</Text>
          </View>

          {/* Gender */}
          <View style={styles.section}>
            <Text style={styles.label}>性別</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={gender ?? ''}
                onValueChange={(itemValue) => setGender(itemValue === '' ? undefined : itemValue as GenderType)}
                style={[styles.picker, styles.pickerText]}
                itemStyle={styles.pickerItem}
                dropdownIconColor={colors.text.secondary}
              >
                <Picker.Item label="選択してください" value="" />
                <Picker.Item label="男性" value="male" />
                <Picker.Item label="女性" value="female" />
                <Picker.Item label="その他" value="other" />
              </Picker>
            </View>
            <Text style={styles.helpText}>※他のユーザーには表示されません</Text>
          </View>

          {/* Prefecture */}
          <View style={styles.section}>
            <Text style={styles.label}>都道府県</Text>
            <PrefecturePicker value={prefecture} onChange={setPrefecture} pickerStyle={styles.pickerContainer} />
            <Text style={styles.helpText}>※他のユーザーには表示されません</Text>
          </View>

          {/* Notification Preferences */}
          <View style={styles.section}>
            <Text style={styles.label}>通知設定</Text>

            <View style={styles.toggleRow}>
              <View style={styles.toggleTexts}>
                <Text style={styles.toggleTitle}>06:00 お題配信通知</Text>
                <Text style={styles.toggleDescription}>朝の新テーマをお知らせします</Text>
              </View>
              <Switch
                value={themeNotificationEnabled}
                onValueChange={setThemeNotificationEnabled}
                disabled={isSaving}
                trackColor={{ false: 'rgba(107, 123, 79, 0.3)', true: colors.text.primary }}
                thumbColor={themeNotificationEnabled ? colors.text.inverse : '#f4f3f4'}
                ios_backgroundColor="rgba(107, 123, 79, 0.3)"
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleTexts}>
                <Text style={styles.toggleTitle}>22:00 ランキング確定通知</Text>
                <Text style={styles.toggleDescription}>投稿結果の確定タイミングをお知らせします</Text>
              </View>
              <Switch
                value={rankingNotificationEnabled}
                onValueChange={setRankingNotificationEnabled}
                disabled={isSaving}
                trackColor={{ false: 'rgba(107, 123, 79, 0.3)', true: colors.text.primary }}
                thumbColor={rankingNotificationEnabled ? colors.text.inverse : '#f4f3f4'}
                ios_backgroundColor="rgba(107, 123, 79, 0.3)"
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
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.text.inverse} />
                <Text style={styles.saveButtonText}>保存する</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Account Deletion */}
          <View style={styles.dangerZone}>
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

      <CircularCropModal
        visible={cropModalVisible}
        imageUri={selectedImageUri}
        onCancel={() => {
          setCropModalVisible(false);
          // Re-open image picker for retry
          handlePickImage();
        }}
        onConfirm={handleCropConfirm}
      />
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
    paddingBottom: spacing.xxl * 3, // Extra padding at bottom to prevent content overlap on all devices
  },
  header: {
    marginBottom: spacing.lg,
    zIndex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background.secondary,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.text.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background.primary,
  },
  avatarHint: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.regular,
    color: colors.text.tertiary,
    letterSpacing: 0.3,
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
    marginBottom: spacing.xl, // Increased margin for better separation
    zIndex: 1,
  },
  label: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
    zIndex: 2,
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  toggleTexts: {
    flex: 1,
    paddingRight: spacing.md,
  },
  toggleTitle: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    letterSpacing: 0.3,
  },
  toggleDescription: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.regular,
    color: colors.text.secondary,
    marginTop: 2,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: 'rgba(107, 123, 79, 0.2)',
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.card,
    justifyContent: 'center',
    minHeight: 56,
    overflow: 'hidden', // Prevent picker overflow
    zIndex: 1,
  },
  picker: {
    height: Platform.select({ ios: 180, android: 56 }),
    zIndex: 1,
  },
  pickerText: {
    color: colors.text.primary,
    backgroundColor: 'transparent',
  },
  pickerItem: {
    color: colors.text.primary,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.xl * 2, // Increased margin for better separation
    marginBottom: spacing.xl, // Increased margin to prevent overlap
    gap: spacing.sm,
    ...shadow.md,
    zIndex: 10, // High z-index to ensure it's on top
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
    marginTop: spacing.xl * 2, // Increased top margin for better separation
    paddingTop: spacing.xl,
    marginBottom: spacing.xxl, // Increased bottom margin for better spacing
    borderTopWidth: 1,
    borderTopColor: 'rgba(229, 62, 62, 0.2)',
    zIndex: 5,
  },
  dangerZoneDescription: {
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.regular,
    color: colors.text.secondary,
    marginBottom: spacing.lg, // Increased margin
    letterSpacing: 0.3,
    lineHeight: 20, // Added line height for better readability
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
    zIndex: 6,
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
