import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  ScrollView,
  Share as NativeShare,
} from 'react-native';
import { downloadAsync, cacheDirectory, deleteAsync } from 'expo-file-system/legacy';
import ShareCard from './ShareCard';
import * as Sharing from 'expo-sharing';
import type { SharePayload } from '../types/share';
import { colors, spacing, borderRadius, shadow, fontFamily, fontSize } from '../theme';
import { API_BASE_URL } from '../config';

interface ShareSheetProps {
  visible: boolean;
  payload: SharePayload | null;
  onClose: () => void;
}

const ShareSheet: React.FC<ShareSheetProps> = ({ visible, payload, onClose }) => {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = useCallback(async () => {
    if (!payload || !payload.workId) {
      return;
    }

    try {
      setIsSharing(true);

      // サーバーから画像を取得
      console.log('[ShareSheet] Fetching image from server...');
      const imageUrl = `${API_BASE_URL}/share/card/${payload.workId}`;

      // 画像をダウンロード
      const downloadResult = await downloadAsync(
        imageUrl,
        cacheDirectory + `share_${payload.workId}.png`
      );

      if (downloadResult.status !== 200) {
        throw new Error('Failed to download image from server');
      }

      console.log('[ShareSheet] Image downloaded successfully:', downloadResult.uri);

      // 画像で共有
      const canShareFile = await Sharing.isAvailableAsync();
      if (canShareFile) {
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: 'image/png',
          UTI: 'public.png',
        });

        // クリーンアップ
        setTimeout(() => {
          deleteAsync(downloadResult.uri).catch(err =>
            console.warn('[ShareSheet] Cleanup error:', err)
          );
        }, 3000);
      } else {
        // フォールバック: テキスト共有
        await NativeShare.share({
          message: payload.message,
        });
      }

      onClose();
    } catch (error) {
      console.error('[ShareSheet] Share failed:', error);

      // エラー時はテキストで共有を試みる
      try {
        await NativeShare.share({
          message: payload.message,
        });
        onClose();
      } catch (fallbackError) {
        Alert.alert('共有に失敗しました', '時間をおいて再度お試しください。');
      }
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

            <View style={styles.previewContainer}>
              <View style={styles.cardPreview}>
                {payload && <ShareCard content={payload.card} />}
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[
                  styles.shareButton,
                  isSharing && styles.shareButtonDisabled,
                ]}
                onPress={handleShare}
                disabled={isSharing}
                activeOpacity={0.8}
              >
                {isSharing ? (
                  <View style={styles.preparingRow}>
                    <ActivityIndicator color={colors.text.inverse} size="small" />
                    <Text style={styles.shareButtonText}>画像を生成中...</Text>
                  </View>
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
    backgroundColor: colors.background.card,
  },
  actions: {
    gap: spacing.sm,
  },
  shareButton: {
    backgroundColor: colors.text.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonDisabled: {
    opacity: 0.5,
  },
  preparingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
