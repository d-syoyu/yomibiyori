import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  NativeModules,
  Platform,
  ScrollView,
  AppState,
  Share as NativeShare,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import ShareCard from './ShareCard';
import * as Sharing from 'expo-sharing';
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
  const cardReadyPromiseRef = useRef<Promise<void> | null>(null);
  const cardReadyResolverRef = useRef<(() => void) | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isCardReady, setIsCardReady] = useState(false);

  useEffect(() => {
    setIsCardReady(false);
    if (visible && payload) {
      cardReadyPromiseRef.current = new Promise(resolve => {
        cardReadyResolverRef.current = resolve;
      });
    } else {
      cardReadyPromiseRef.current = null;
      cardReadyResolverRef.current = null;
    }
  }, [visible, payload]);

  const handleShare = useCallback(async () => {
    if (!payload || !viewShotRef.current) {
      return;
    }

    if (!isViewShotAvailable) {
      Alert.alert(
        '共有カードが生成できません',
        'この機能には専用ビルドのアプリが必要です。Expo Go や Web では利用できません。'
      );
      return;
    }

    const ensureCardReady = async (): Promise<void> => {
      if (!cardReadyPromiseRef.current) {
        return;
      }
      await cardReadyPromiseRef.current;
      cardReadyPromiseRef.current = null;
    };

    const captureWithRetry = async (attempt = 0): Promise<string> => {
      try {
        await ensureCardReady();
        const uri = await viewShotRef.current?.capture?.();
        if (!uri) {
          throw new Error('capture_failed');
        }
        return uri;
      } catch (error: any) {
        const message = error?.message ?? '';
        if (attempt < 3 && message.includes('Failed to snapshot view tag')) {
          await new Promise(resolve => setTimeout(resolve, 150));
          return captureWithRetry(attempt + 1);
        }
        throw error;
      }
    };

    try {
      setIsSharing(true);
      const uri = await captureWithRetry();

      const canShareFile = await Sharing.isAvailableAsync();
      if (canShareFile) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          UTI: 'public.png',
        });
      } else {
        await NativeShare.share({
          message: payload.message,
        });
      }

      const cleanup = () => {
        setTimeout(() => {
          FileSystem.deleteAsync(uri).catch(() => {});
        }, 3000);
      };
      const appStateListener = AppState.addEventListener('change', state => {
        if (state === 'active') {
          cleanup();
          appStateListener.remove();
        }
      });
      cleanup();

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
                onLayout={() => {
                  setIsCardReady(true);
                  if (cardReadyResolverRef.current) {
                    cardReadyResolverRef.current();
                    cardReadyResolverRef.current = null;
                  }
                }}
              >
                {payload && <ShareCard content={payload.card} />}
              </ViewShot>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[
                  styles.shareButton,
                  (isSharing || !payload || !isViewShotAvailable || !isCardReady) && styles.shareButtonDisabled,
                ]}
                onPress={handleShare}
                disabled={isSharing || !payload || !isViewShotAvailable || !isCardReady}
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
