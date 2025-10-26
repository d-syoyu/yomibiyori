/**
 * Login Screen
 * ログイン・サインアップ画面
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { useAuthStore } from '../stores/useAuthStore';
import { useToastStore } from '../stores/useToastStore';
import { parseApiError } from '../utils/errorHandler';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const { signUp, login, isLoading, error, clearError } = useAuthStore();
  const showError = useToastStore((state) => state.showError);

  const handleAuth = async () => {
    if (!email || !password) {
      showError('メールアドレスとパスワードを入力してください');
      return;
    }

    if (isSignUp && !displayName.trim()) {
      showError('表示名を入力してください');
      return;
    }

    try {
      if (isSignUp) {
        await signUp({ email, password, display_name: displayName.trim() });
      } else {
        await login({ email, password });
      }
    } catch (err: any) {
      // Parse error and show user-friendly message
      const errorInfo = parseApiError(err);
      showError(errorInfo.message, errorInfo.title);
      clearError();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>詠日和</Text>
        <Text style={styles.subtitle}>よみびより</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="メールアドレス"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="パスワード"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={true}
          />

          {isSignUp && (
            <TextInput
              style={styles.input}
              placeholder="表示名"
              value={displayName}
              onChangeText={setDisplayName}
            />
          )}

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? '処理中...' : isSignUp ? 'サインアップ' : 'ログイン'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setIsSignUp(!isSignUp)}
          >
            <Text style={styles.switchButtonText}>
              {isSignUp
                ? 'アカウントをお持ちの方はこちら'
                : 'アカウントをお持ちでない方はこちら'}
            </Text>
          </TouchableOpacity>

          {!isSignUp && (
            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={() => navigation.navigate('PasswordReset')}
            >
              <Text style={styles.forgotPasswordText}>パスワードを忘れた方はこちら</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
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
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    marginBottom: 48,
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
  switchButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchButtonText: {
    color: '#4A5568',
    fontSize: 14,
  },
  forgotPasswordButton: {
    marginTop: 8,
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: '#718096',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});
