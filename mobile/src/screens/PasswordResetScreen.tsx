/**
 * Password Reset Screen
 * パスワードリセット画面（ブラウザベース - シンプル版）
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import { colors, spacing, borderRadius, shadow, fontSize, fontFamily } from '../theme';

export default function PasswordResetScreen() {
  const navigation = useNavigation();

  // バックエンドのベースURL（またはSupabaseの直接URL）
  const API_BASE_URL =
    Constants.expoConfig?.extra?.apiBaseUrl ||
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    'http://localhost:8000/api/v1';

  // パスワードリセット用のWebページを開く
  const handleOpenResetPage = async () => {
    // バックエンドにWebページがある場合
    const resetUrl = `${API_BASE_URL.replace('/api/v1', '')}/reset-password`;

    // または、Supabaseの標準UIを使う場合
    // const resetUrl = 'https://your-project.supabase.co/auth/reset-password';

    try {
      const supported = await Linking.canOpenURL(resetUrl);
      if (supported) {
        await Linking.openURL(resetUrl);
      } else {
        Alert.alert(
          'エラー',
          'ブラウザを開けませんでした。後ほど再度お試しください。'
        );
      }
    } catch (error) {
      console.error('Failed to open URL:', error);
      Alert.alert('エラー', 'リンクを開けませんでした。');
    }
  };

  const handleBackToLogin = () => {
    navigation.goBack();
  };

  return (
    <LinearGradient
      colors={[colors.background.primary, colors.background.secondary]}
      style={styles.gradient}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>パスワードリセット</Text>

          <View style={styles.card}>
            <Text style={styles.description}>
              パスワードをリセットするには、{'\n'}
              ブラウザでWebページを開きます。{'\n\n'}
              メールアドレスを入力すると、{'\n'}
              パスワードリセット用のリンクが送信されます。
            </Text>

            <View style={styles.form}>
              <TouchableOpacity
                style={styles.button}
                onPress={handleOpenResetPage}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.text.primary, colors.text.secondary, colors.text.tertiary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>ブラウザで開く</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.backButton} onPress={handleBackToLogin}>
                <Text style={styles.backButtonText}>ログイン画面に戻る</Text>
              </TouchableOpacity>

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  💡 Webページでパスワードをリセット後、{'\n'}
                  アプリに戻って新しいパスワードで{'\n'}
                  ログインしてください。
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: fontSize.h1,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.xl,
    letterSpacing: 2,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...shadow.lg,
  },
  description: {
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.regular,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
    letterSpacing: 0.5,
  },
  form: {
    width: '100%',
  },
  button: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginTop: spacing.sm,
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonGradient: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.text.inverse,
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    letterSpacing: 1,
  },
  backButton: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  backButtonText: {
    color: colors.text.secondary,
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.regular,
    letterSpacing: 0.5,
  },
  infoBox: {
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.text.primary,
  },
  infoText: {
    color: colors.text.primary,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.regular,
    lineHeight: 20,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
