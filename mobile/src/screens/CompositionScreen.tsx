/**
 * Composition Screen
 * 詠み作成画面 - 俳句を作成する
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
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../types';
import api from '../services/api';
import VerticalText from '../components/VerticalText';

type Props = NativeStackScreenProps<HomeStackParamList, 'Composition'>;
type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

export default function CompositionScreen({ route }: Props) {
  const navigation = useNavigation<NavigationProp>();
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const theme = route.params?.theme;

  const handleSubmit = async () => {
    if (!line1.trim() || !line2.trim()) {
      Alert.alert('エラー', '下の句を両方入力してください');
      return;
    }

    if (!theme) {
      Alert.alert('エラー', 'お題が選択されていません');
      return;
    }

    setIsSubmitting(true);
    try {
      // APIに作品を投稿（改行で結合）
      await api.createWork({
        theme_id: theme.id,
        text: `${line1.trim()}\n${line2.trim()}`,
      });

      // 投稿成功後、鑑賞画面に遷移
      Alert.alert(
        '投稿完了',
        '作品を投稿しました！他の作品を見てみましょう',
        [
          {
            text: 'OK',
            onPress: () => {
              setLine1('');
              setLine2('');
              // 同じカテゴリの鑑賞画面に遷移
              navigation.navigate('Appreciation', { category: theme.category });
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Failed to submit work:', error);

      // Provide user-friendly error messages
      let errorMessage = '投稿に失敗しました';
      if (error?.status === 409) {
        errorMessage = '今日はすでにこのカテゴリに投稿済みです';
      } else if (error?.status === 403) {
        errorMessage = '投稿時間外です\n投稿は6:00〜22:00の間のみ可能です';
      } else if (error?.status === 0) {
        errorMessage = 'ネットワークに接続できません\n接続を確認してください';
      } else if (error?.detail) {
        errorMessage = error.detail;
      }

      Alert.alert('エラー', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>詠む</Text>

          {theme ? (
            <View style={styles.themeCard}>
              <Text style={styles.themeLabel}>今日のお題（上の句）</Text>
              <View style={styles.verticalTextContainer}>
                <VerticalText
                  text={theme.text}
                  textStyle={styles.themeVerticalText}
                  direction="rtl"
                />
              </View>
              <Text style={styles.themeCategory}>{theme.category}</Text>
            </View>
          ) : (
            <View style={styles.noThemeCard}>
              <Text style={styles.noThemeText}>
                お題を選択してください
              </Text>
            </View>
          )}

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>下の句（第一句：7音）</Text>
          <TextInput
            style={styles.textInput}
            placeholder="7音で入力してください"
            value={line1}
            onChangeText={setLine1}
            multiline={true}
            maxLength={20}
            editable={!!theme}
          />
          <Text style={styles.charCount}>{line1.length} / 20</Text>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>下の句（第二句：7音）</Text>
          <TextInput
            style={styles.textInput}
            placeholder="7音で入力してください"
            value={line2}
            onChangeText={setLine2}
            multiline={true}
            maxLength={20}
            editable={!!theme}
          />
          <Text style={styles.charCount}>{line2.length} / 20</Text>
        </View>

        {/* プレビュー表示 */}
        {(line1.trim() || line2.trim()) && (
          <View style={styles.previewSection}>
            <Text style={styles.previewLabel}>プレビュー</Text>
            <View style={styles.previewCard}>
              {/* お題（上の句） */}
              {theme && (
                <View style={styles.previewTheme}>
                  <Text style={styles.previewThemeLabel}>お題</Text>
                  <View style={styles.verticalTextContainer}>
                    <VerticalText
                      text={theme.text}
                      textStyle={styles.previewThemeText}
                      direction="rtl"
                    />
                  </View>
                </View>
              )}

              {/* 下の句 */}
              {(line1.trim() || line2.trim()) && (
                <View style={styles.previewWork}>
                  <Text style={styles.previewWorkLabel}>下の句</Text>
                  <View style={styles.verticalTextContainer}>
                    <VerticalText
                      text={`${line1}\n${line2}`}
                      textStyle={styles.previewWorkText}
                      direction="ltr"
                    />
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.submitButton,
            (!theme || isSubmitting || !line1.trim() || !line2.trim()) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!theme || isSubmitting || !line1.trim() || !line2.trim()}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? '投稿中...' : '投稿する'}
          </Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 24,
  },
  themeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  themeLabel: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 12,
    fontWeight: '600',
  },
  verticalTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    marginVertical: 8,
  },
  themeVerticalText: {
    fontSize: 18,
    lineHeight: 30,
    color: '#2D3748',
    fontWeight: '600',
  },
  themeCategory: {
    fontSize: 14,
    color: '#4A5568',
    marginTop: 8,
    textAlign: 'center',
  },
  noThemeCard: {
    backgroundColor: '#EDF2F7',
    borderRadius: 12,
    padding: 40,
    marginBottom: 24,
    alignItems: 'center',
  },
  noThemeText: {
    fontSize: 16,
    color: '#718096',
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#718096',
    textAlign: 'right',
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#4A5568',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#CBD5E0',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  previewSection: {
    marginBottom: 24,
  },
  previewLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 12,
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewTheme: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  previewThemeLabel: {
    fontSize: 12,
    color: '#A0AEC0',
    marginBottom: 8,
    fontWeight: '600',
  },
  previewThemeText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#4A5568',
    fontWeight: '500',
  },
  previewWork: {
    marginBottom: 8,
  },
  previewWorkLabel: {
    fontSize: 12,
    color: '#A0AEC0',
    marginBottom: 8,
    fontWeight: '600',
  },
  previewWorkText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#2D3748',
    fontWeight: '400',
  },
});
