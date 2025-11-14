/**
 * SVGベース共有シート
 * より安定的な画像生成を実現
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  AppState,
  Share as NativeShare,
  Platform,
  NativeModules,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import ShareCardSVG from './svg/ShareCardSVG';
import { captureSvgToImageWithRetry } from '../utils/svgToImage';
import type { SharePayload } from '../types/share';
import { colors, spacing, borderRadius, shadow, fontFamily, fontSize } from '../theme';

interface ShareSheetSVGProps {
  visible: boolean;
  payload: SharePayload | null;
  onClose: () => void;
}

const isViewShotAvailable =
  Platform.OS !== 'web' && typeof (NativeModules as any)?.RNViewShot !== 'undefined';

const ShareSheetSVG: React.FC<ShareSheetSVGProps> = ({ visible, payload, onClose }) => {
  const svgRef = useRef<any>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isSvgReady, setIsSvgReady] = useState(false);

  const handleShare = useCallback(async () => {
    if (!payload || !svgRef.current) {
      return;
    }

    if (!isViewShotAvailable) {
      Alert.alert(
        '共有カードが生成できません',
        'この機能には専用ビルドのアプリが必要です。Expo Go や Web では利用できません。'
      );
      return;
    }

    try {
      setIsSharing(true);

      // SVGを画像に変換
      console.log('[ShareSheetSVG] Starting SVG capture...');
      const uri = await captureSvgToImageWithRetry(svgRef, {
        width: 1080,
        height: 1920,
        quality: 1,
      });
      console.log('[ShareSheetSVG] SVG captured successfully:', uri);

      // 共有
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

      // クリーンアップ
      const cleanup = () => {
        setTimeout(() => {
          console.log('[ShareSheetSVG] Cleaning up temp file:', uri);
          FileSystem.deleteAsync(uri).catch(err =>
            console.warn('[ShareSheetSVG] Cleanup error:', err)
          );
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
      console.error('[ShareSheetSVG] Share failed:', error);
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
              <View
                style={styles.svgWrapper}
                onLayout={() => {
                  // SVGのレンダリングが完了するまで少し待機
                  setTimeout(() => {
                    setIsSvgReady(true);
                    console.log('[ShareSheetSVG] SVG ready for capture');
                  }, 300);
                }}
              >
                {payload && (
                  <View
                    ref={svgRef}
                    collapsable={false}
                    style={styles.svgContainer}
                  >
                    <ShareCardSVG content={payload.card} width={324} height={576} />
                  </View>
                )}
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[
                  styles.shareButton,
                  (isSharing || !payload || !isViewShotAvailable || !isSvgReady) &&
                    styles.shareButtonDisabled,
                ]}
                onPress={handleShare}
                disabled={isSharing || !payload || !isViewShotAvailable || !isSvgReady}
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
  svgWrapper: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    width: 324,
    height: 576,
    backgroundColor: colors.background.card,
  },
  svgContainer: {
    width: 324,
    height: 576,
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

export default ShareSheetSVG;
