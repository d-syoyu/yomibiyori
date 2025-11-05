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
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { useAuthStore } from '../stores/useAuthStore';
import { useToastStore } from '../stores/useToastStore';
import { useApiErrorHandler } from '../hooks/useApiErrorHandler';
import { VALIDATION_MESSAGES } from '../constants/errorMessages';
import { colors, spacing, borderRadius, shadow, fontSize, fontFamily } from '../theme';
import { identifyUser, trackEvent, EventNames } from '../utils/analytics';
import api from '../services/api';

WebBrowser.maybeCompleteAuthSession();

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);

  const { signUp, login, loginWithOAuth, isLoading, error, clearError } = useAuthStore();
  const showError = useToastStore((state) => state.showError);
  const { handleError } = useApiErrorHandler();

  const handleAuth = async () => {
    if (!email || !password) {
      showError(VALIDATION_MESSAGES.login.emptyCredentials);
      return;
    }

    if (isSignUp && !displayName.trim()) {
      showError(VALIDATION_MESSAGES.login.emptyDisplayName);
      return;
    }

    try {
      if (isSignUp) {
        await signUp({ email, password, display_name: displayName.trim() });
        trackEvent(EventNames.SIGNUP_ATTEMPTED, { success: true });
      } else {
        await login({ email, password });
        trackEvent(EventNames.LOGIN_ATTEMPTED, { success: true });
      }

      // Identify user after successful login/signup
      const user = useAuthStore.getState().user;
      if (user?.user_id) {
        identifyUser(user.user_id, {
          email: user.email,
          display_name: user.display_name,
        });
      }

      // Close modal and return to previous screen
      navigation.goBack();
    } catch (err: any) {
      trackEvent(isSignUp ? EventNames.SIGNUP_ATTEMPTED : EventNames.LOGIN_ATTEMPTED, {
        success: false,
        error: err?.message || 'Unknown error',
      });
      handleError(err, 'authentication');
      clearError();
    }
  };

  const handleGoogleLogin = async () => {
    setIsOAuthLoading(true);
    console.log('[Auth] Starting Google OAuth flow...');

    try {
      // Determine redirect URL based on environment
      // Expo Go uses exp:// scheme, standalone app uses custom scheme
      const redirectUrl = Constants.appOwnership === 'expo'
        ? Linking.createURL('/')
        : 'yomibiyori://';

      console.log('[Auth] Redirect URL:', redirectUrl);
      console.log('[Auth] App ownership:', Constants.appOwnership);

      // Get OAuth URL from backend with redirect URL for mobile app
      console.log('[Auth] Fetching OAuth URL from backend...');
      const oauthData = await api.getGoogleOAuthUrl(redirectUrl);
      console.log('[Auth] OAuth URL received:', oauthData.url);

      // Open browser for OAuth flow
      console.log('[Auth] Opening browser for authentication...');
      const result = await WebBrowser.openAuthSessionAsync(
        oauthData.url,
        redirectUrl
      );

      console.log('[Auth] Browser result type:', result.type);
      console.log('[Auth] Browser result:', JSON.stringify(result, null, 2));

      if (result.type === 'success') {
        // Extract tokens from callback URL
        // Supabase can return tokens in URL fragment (#) or query parameters (?)
        const url = result.url;
        console.log('[Auth] OAuth callback URL:', url);

        // Try to parse from fragment first (#access_token=...)
        let params = new URLSearchParams(url.split('#')[1] || '');
        let accessToken = params.get('access_token');
        let refreshToken = params.get('refresh_token');

        // If not found in fragment, try query parameters (?access_token=...)
        if (!accessToken) {
          const urlObj = new URL(url);
          params = urlObj.searchParams;
          accessToken = params.get('access_token');
          refreshToken = params.get('refresh_token');
        }

        console.log('[Auth] Access token found:', !!accessToken);
        console.log('[Auth] Refresh token found:', !!refreshToken);

        if (!accessToken) {
          showError('Google認証に失敗しました');
          trackEvent(EventNames.LOGIN_ATTEMPTED, {
            success: false,
            auth_method: 'google_oauth',
            error: 'No access token in callback',
          });
          return;
        }

        // Process OAuth callback
        await loginWithOAuth({
          access_token: accessToken,
          refresh_token: refreshToken || undefined,
        });

        trackEvent(EventNames.LOGIN_ATTEMPTED, {
          success: true,
          auth_method: 'google_oauth',
        });

        // Identify user after successful OAuth login
        const user = useAuthStore.getState().user;
        if (user?.user_id) {
          identifyUser(user.user_id, {
            email: user.email,
            display_name: user.display_name,
          });
        }

        // Close modal and return to previous screen
        navigation.goBack();
      } else {
        // User cancelled or other error
        console.log('[Auth] OAuth cancelled or failed:', result.type);
        trackEvent(EventNames.LOGIN_ATTEMPTED, {
          success: false,
          auth_method: 'google_oauth',
          error: result.type,
        });
      }
    } catch (err: any) {
      console.error('[Auth] Google OAuth error:', err);
      trackEvent(EventNames.LOGIN_ATTEMPTED, {
        success: false,
        auth_method: 'google_oauth',
        error: err?.message || 'Unknown error',
      });
      handleError(err, 'authentication');
    } finally {
      setIsOAuthLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setIsOAuthLoading(true);
    console.log('[Auth] Starting Apple OAuth flow...');

    try {
      // Determine redirect URL based on environment
      const redirectUrl = Constants.appOwnership === 'expo'
        ? Linking.createURL('/')
        : 'yomibiyori://';

      console.log('[Auth] Redirect URL:', redirectUrl);
      console.log('[Auth] App ownership:', Constants.appOwnership);

      // Get OAuth URL from backend
      console.log('[Auth] Fetching Apple OAuth URL from backend...');
      const oauthData = await api.getAppleOAuthUrl(redirectUrl);
      console.log('[Auth] OAuth URL received:', oauthData.url);

      // Open browser for OAuth flow
      console.log('[Auth] Opening browser for authentication...');
      const result = await WebBrowser.openAuthSessionAsync(
        oauthData.url,
        redirectUrl
      );

      console.log('[Auth] Browser result type:', result.type);
      console.log('[Auth] Browser result:', JSON.stringify(result, null, 2));

      if (result.type === 'success') {
        // Extract tokens from callback URL
        const url = result.url;
        console.log('[Auth] OAuth callback URL:', url);

        // Try to parse from fragment first (#access_token=...)
        let params = new URLSearchParams(url.split('#')[1] || '');
        let accessToken = params.get('access_token');
        let refreshToken = params.get('refresh_token');

        // If not found in fragment, try query parameters (?access_token=...)
        if (!accessToken) {
          const urlObj = new URL(url);
          params = urlObj.searchParams;
          accessToken = params.get('access_token');
          refreshToken = params.get('refresh_token');
        }

        console.log('[Auth] Access token found:', !!accessToken);
        console.log('[Auth] Refresh token found:', !!refreshToken);

        if (!accessToken) {
          showError('Apple認証に失敗しました');
          trackEvent(EventNames.LOGIN_ATTEMPTED, {
            success: false,
            auth_method: 'apple_oauth',
            error: 'No access token in callback',
          });
          return;
        }

        // Process OAuth callback
        await loginWithOAuth({
          access_token: accessToken,
          refresh_token: refreshToken || undefined,
        });

        trackEvent(EventNames.LOGIN_ATTEMPTED, {
          success: true,
          auth_method: 'apple_oauth',
        });

        // Identify user after successful OAuth login
        const user = useAuthStore.getState().user;
        if (user?.user_id) {
          identifyUser(user.user_id, {
            email: user.email,
            display_name: user.display_name,
          });
        }

        // Close modal and return to previous screen
        navigation.goBack();
      } else {
        // User cancelled or other error
        console.log('[Auth] OAuth cancelled or failed:', result.type);
        trackEvent(EventNames.LOGIN_ATTEMPTED, {
          success: false,
          auth_method: 'apple_oauth',
          error: result.type,
        });
      }
    } catch (err: any) {
      console.error('[Auth] Apple OAuth error:', err);
      trackEvent(EventNames.LOGIN_ATTEMPTED, {
        success: false,
        auth_method: 'apple_oauth',
        error: err?.message || 'Unknown error',
      });
      handleError(err, 'authentication');
    } finally {
      setIsOAuthLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[colors.background.primary, colors.background.secondary]}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <Text style={styles.title}>よみびより</Text>

          <View style={styles.card}>
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="メールアドレス"
                placeholderTextColor={colors.text.tertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <TextInput
                style={styles.input}
                placeholder="パスワード"
                placeholderTextColor={colors.text.tertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={true}
              />

              {isSignUp && (
                <TextInput
                  style={styles.input}
                  placeholder="表示名"
                  placeholderTextColor={colors.text.tertiary}
                  value={displayName}
                  onChangeText={setDisplayName}
                />
              )}

              <TouchableOpacity
                style={styles.button}
                onPress={handleAuth}
                disabled={isLoading || isOAuthLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    isLoading || isOAuthLoading
                      ? ['#CBD5E0', '#A0AEC0']
                      : [colors.text.primary, colors.text.secondary, colors.text.tertiary]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>
                    {isLoading || isOAuthLoading ? '処理中...' : isSignUp ? 'サインアップ' : 'ログイン'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {!isSignUp && (
                <>
                  <TouchableOpacity
                    style={styles.googleButton}
                    onPress={handleGoogleLogin}
                    disabled={isLoading || isOAuthLoading}
                    activeOpacity={0.8}
                  >
                    <View style={styles.googleButtonContent}>
                      {isOAuthLoading ? (
                        <ActivityIndicator size="small" color={colors.text.primary} />
                      ) : (
                        <>
                          <AntDesign name="google" size={20} color={colors.text.primary} style={styles.buttonIcon} />
                          <Text style={styles.googleButtonText}>Googleでログイン</Text>
                        </>
                      )}
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.appleButton}
                    onPress={handleAppleLogin}
                    disabled={isLoading || isOAuthLoading}
                    activeOpacity={0.8}
                  >
                    <View style={styles.appleButtonContent}>
                      {isOAuthLoading ? (
                        <ActivityIndicator size="small" color={colors.text.inverse} />
                      ) : (
                        <>
                          <Ionicons name="logo-apple" size={20} color={colors.text.inverse} style={styles.buttonIcon} />
                          <Text style={styles.appleButtonText}>Appleでログイン</Text>
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                </>
              )}

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
        </View>
      </KeyboardAvoidingView>
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
    marginBottom: spacing.xxl,
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
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(107, 123, 79, 0.2)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    color: colors.text.primary,
    marginBottom: spacing.md,
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
  switchButton: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  switchButtonText: {
    color: colors.text.secondary,
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.regular,
    letterSpacing: 0.5,
  },
  forgotPasswordButton: {
    marginTop: spacing.sm,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  forgotPasswordText: {
    color: colors.text.tertiary,
    fontSize: fontSize.caption,
    fontFamily: fontFamily.regular,
    textDecorationLine: 'underline',
    letterSpacing: 0.3,
  },
  googleButton: {
    marginTop: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(107, 123, 79, 0.3)',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadow.sm,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 20,
  },
  googleButtonText: {
    color: colors.text.primary,
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    letterSpacing: 0.5,
  },
  appleButton: {
    marginTop: spacing.md,
    backgroundColor: '#000000',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadow.sm,
  },
  appleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 20,
  },
  appleButtonText: {
    color: colors.text.inverse,
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginRight: spacing.sm,
  },
});
