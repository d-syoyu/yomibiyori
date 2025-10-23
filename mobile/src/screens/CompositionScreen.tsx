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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../types';
import api from '../services/api';

type Props = NativeStackScreenProps<HomeStackParamList, 'Composition'>;
type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

export default function CompositionScreen({ route }: Props) {
  const navigation = useNavigation<NavigationProp>();
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const theme = route.params?.theme;

  const handleSubmit = async () => {
    if (!text.trim()) {
      Alert.alert('エラー', '俳句を入力してください');
      return;
    }

    if (!theme) {
      Alert.alert('エラー', 'お題が選択されていません');
      return;
    }

    setIsSubmitting(true);
    try {
      // APIに作品を投稿
      await api.createWork({
        theme_id: theme.id,
        text: text.trim(),
      });

      // 投稿成功後、鑑賞画面に遷移
      Alert.alert(
        '投稿完了',
        '作品を投稿しました！他の作品を見てみましょう',
        [
          {
            text: 'OK',
            onPress: () => {
              setText('');
              // 同じカテゴリの鑑賞画面に遷移
              navigation.navigate('Appreciation', { category: theme.category });
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Failed to submit work:', error);
      const errorMessage = error.detail || '投稿に失敗しました';
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
      <View style={styles.content}>
        <Text style={styles.title}>詠む</Text>

        {theme ? (
          <View style={styles.themeCard}>
            <Text style={styles.themeLabel}>今日のお題</Text>
            <Text style={styles.themeText}>{theme.text}</Text>
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
          <Text style={styles.inputLabel}>あなたの俳句</Text>
          <TextInput
            style={styles.textInput}
            placeholder="俳句を入力してください（17音）"
            value={text}
            onChangeText={setText}
            multiline={true}
            maxLength={100}
            editable={!!theme}
          />
          <Text style={styles.charCount}>{text.length} / 100</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (!theme || isSubmitting || !text.trim()) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!theme || isSubmitting || !text.trim()}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? '投稿中...' : '投稿する'}
          </Text>
        </TouchableOpacity>
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
    padding: 20,
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
    marginBottom: 8,
  },
  themeText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 8,
  },
  themeCategory: {
    fontSize: 14,
    color: '#4A5568',
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
    minHeight: 120,
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
});
