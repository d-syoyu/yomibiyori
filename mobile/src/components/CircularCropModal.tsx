/**
 * Circular Crop Preview Modal
 * ネイティブクロップ後の丸形プレビュー確認画面
 */

import React from 'react';
import {
  View,
  Modal,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontFamily, borderRadius } from '../theme';

const PREVIEW_SIZE = 200;

interface CircularCropModalProps {
  visible: boolean;
  imageUri: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function CircularCropModal({
  visible,
  imageUri,
  onCancel,
  onConfirm,
}: CircularCropModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.content}>
            <Text style={styles.title}>プレビュー</Text>
            <Text style={styles.subtitle}>この画像をプロフィールに使用しますか？</Text>

            {/* Circular preview */}
            <View style={styles.previewContainer}>
              {imageUri && (
                <Image
                  source={{ uri: imageUri }}
                  style={styles.previewImage}
                />
              )}
            </View>

            {/* Buttons */}
            <View style={styles.buttons}>
              <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                <Text style={styles.cancelButtonText}>やり直す</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
                <Ionicons name="checkmark" size={20} color={colors.text.inverse} />
                <Text style={styles.confirmButtonText}>使用する</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '100%',
    alignItems: 'center',
  },
  content: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    marginHorizontal: spacing.xl,
    alignItems: 'center',
    width: '85%',
    maxWidth: 360,
  },
  title: {
    fontSize: fontSize.h3,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.regular,
    color: colors.text.secondary,
    letterSpacing: 0.3,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  previewContainer: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    borderRadius: PREVIEW_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: colors.background.secondary,
    marginBottom: spacing.xl,
  },
  previewImage: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(107, 123, 79, 0.3)',
    backgroundColor: colors.background.primary,
  },
  cancelButtonText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.text.primary,
    gap: spacing.xs,
  },
  confirmButtonText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    color: colors.text.inverse,
    letterSpacing: 0.5,
  },
});
