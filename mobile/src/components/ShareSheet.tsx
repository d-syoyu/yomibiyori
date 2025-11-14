import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  NativeModules,
  Platform,
  ScrollView,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import ShareCard from './ShareCard';
import type { SharePayload } from '../types/share';
import { colors, spacing, borderRadius, shadow, fontFamily, fontSize } from '../theme';

interface ShareSheetProps {
  visible: boolean;
  payload: SharePayload | null;
  onClose: () => void;
}

const isViewShotAvailable =
  Platform.OS !== 'web' && typeof (NativeModules as any)?.RNViewShot !== 'undefined';

const ShareSheet: React.FC<ShareSheetProps> = ({ visible, payload, onClose }) => {
  const viewShotRef = useRef<ViewShot | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = useCallback(async () => {
    if (!payload || !viewShotRef.current) {
      return;
    }

    try {
      if (!isViewShotAvailable) {
        Alert.alert(
          '共有カードが生成できません',
          'この機能には専用ビルドのアプリが必要です。Expo Go や Web では利用できません。'
        );
        return;
      }

      setIsSharing(true);
      const uri = await viewShotRef.current?.capture?.();

      if (!uri) {
        throw new Error('capture_failed');
      }

      await Share.share({
        title: 'よみびより | 共有カード',
        message: payload.message,
        url: uri,
      });

      await FileSystem.deleteAsync(uri, { idempotent: true });
      onClose();
    } catch (error) {
      console.error('[ShareSheet] Failed to share card:', error);
      Alert.alert('共有に失敗しました', '時間をおいて再度お試しください。');
    } finally {
      setIsSharing(false);
    }
  }, [payload, onClose]);

  return (
    <Modal
      visible={visible && Boolean(payload)}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sheetTitle}>SNSで共有</Text>
            <Text style={styles.sheetDescription}>
              プレビューを確認して「画像として共有」をタップすると端末の共有シートが開きます。
            </Text>
            {!isViewShotAvailable && (
              <Text style={styles.noticeText}>
                共有カードの生成は Expo Go / Web ではサポートされません。開発用/本番用ビルドでご利用ください。
              </Text>
            )}

            <View style={styles.previewContainer}>
              <ViewShot
                ref={viewShotRef}
                options={{
                  format: 'png',
                  quality: 0.95,
                  result: 'tmpfile',
                }}
                style={styles.cardPreview}
              >
                {payload && <ShareCard content={payload.card} />}
              </ViewShot>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[
                  styles.shareButton,
                  (isSharing || !payload || !isViewShotAvailable) && styles.shareButtonDisabled,
                ]}
                onPress={handleShare}
                disabled={isSharing || !payload || !isViewShotAvailable}
                activeOpacity={0.8}
              >
                {isSharing ? (
                  <ActivityIndicator color={colors.text.inverse} />
                ) : (
                  <Text style={styles.shareButtonText}>画像として共有</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    backgroundColor: colors.background.overlay,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.lg,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  sheetTitle: {
    fontSize: fontSize.h3,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    letterSpacing: 1,
  },
  sheetDescription: {
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.regular,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  noticeText: {
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.semiBold,
    color: colors.status.warning,
    lineHeight: 18,
  },
  previewContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  cardPreview: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    width: '90%',
    maxWidth: 360,
    alignSelf: 'center',
  },
  actions: {
    gap: spacing.sm,
  },
  shareButton: {
    backgroundColor: colors.text.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  shareButtonDisabled: {
    opacity: 0.5,
  },
  shareButtonText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    color: colors.text.inverse,
    letterSpacing: 1,
  },
  cancelButton: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.text.secondary,
  },
  cancelButtonText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.medium,
    color: colors.text.secondary,
  },
});

export default ShareSheet;
