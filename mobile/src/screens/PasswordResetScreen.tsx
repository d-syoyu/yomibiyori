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
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';

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
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>パスワードリセット</Text>
        <Text style={styles.description}>
          パスワードをリセットするには、{'\n'}
          ブラウザでWebページを開きます。{'\n\n'}
          メールアドレスを入力すると、{'\n'}
          パスワードリセット用のリンクが送信されます。
        </Text>

        <View style={styles.form}>
          <TouchableOpacity style={styles.button} onPress={handleOpenResetPage}>
            <Text style={styles.buttonText}>ブラウザで開く</Text>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#4A5568',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#A0AEC0',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#4A5568',
    fontSize: 14,
  },
  infoBox: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#EDF2F7',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4A5568',
  },
  infoText: {
    color: '#2D3748',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});
