/**
 * Circular Crop Modal
 * 丸形クロップモーダル - ピンチズーム＋ドラッグで画像を調整
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  GestureHandlerRootView,
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Rect, Circle, Defs, Mask } from 'react-native-svg';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { colors, spacing, fontSize, fontFamily } from '../theme';

const CIRCLE_RATIO = 0.95; // 円の直径 = 画面幅の95%
const MAX_SCALE = 5;
const OUTPUT_SIZE = 400;
const SPRING_CONFIG = { damping: 15, stiffness: 150 };

interface CircularCropModalProps {
  visible: boolean;
  imageUri: string | null;
  imageSize: { width: number; height: number } | null;
  onCancel: () => void;
  onConfirm: (croppedUri: string) => void;
}

export default function CircularCropModal({
  visible,
  imageUri,
  imageSize,
  onCancel,
  onConfirm,
}: CircularCropModalProps) {
  const { width: screenWidth } = useWindowDimensions();
  const [isCropping, setIsCropping] = useState(false);

  // 円のサイズ
  const circleDiameter = screenWidth * CIRCLE_RATIO;
  const circleRadius = circleDiameter / 2;

  // 画像の表示サイズ（画面幅にフィット）
  const displayWidth = screenWidth;
  const displayHeight = imageSize
    ? screenWidth * (imageSize.height / imageSize.width)
    : screenWidth;

  // 円を完全にカバーするための最小スケール
  const minScale = Math.max(
    circleDiameter / displayWidth,
    circleDiameter / displayHeight,
    1,
  );

  // ジェスチャー用共有値
  const scale = useSharedValue(minScale);
  const savedScale = useSharedValue(minScale);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // モーダル表示時にリセット
  useEffect(() => {
    if (visible && imageSize) {
      const newMinScale = Math.max(
        circleDiameter / displayWidth,
        circleDiameter / displayHeight,
        1,
      );
      scale.value = newMinScale;
      savedScale.value = newMinScale;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    }
  }, [visible, imageSize?.width, imageSize?.height]);

  // 移動範囲を制約（画像が常に円をカバーするように）
  const clampTranslation = (
    x: number,
    y: number,
    currentScale: number,
  ) => {
    'worklet';
    const maxX = Math.max(0, (displayWidth * currentScale - circleDiameter) / 2);
    const maxY = Math.max(0, (displayHeight * currentScale - circleDiameter) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  };

  // ピンチズーム
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      scale.value = Math.max(
        minScale,
        Math.min(MAX_SCALE, savedScale.value * event.scale),
      );
    })
    .onEnd(() => {
      if (scale.value < minScale) {
        scale.value = withSpring(minScale, SPRING_CONFIG);
      }
      const { x, y } = clampTranslation(
        translateX.value,
        translateY.value,
        scale.value,
      );
      translateX.value = withSpring(x, SPRING_CONFIG);
      translateY.value = withSpring(y, SPRING_CONFIG);
    });

  // ドラッグ移動
  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      const rawX = savedTranslateX.value + event.translationX;
      const rawY = savedTranslateY.value + event.translationY;
      const { x, y } = clampTranslation(rawX, rawY, scale.value);
      translateX.value = x;
      translateY.value = y;
    })
    .onEnd(() => {
      const { x, y } = clampTranslation(
        translateX.value,
        translateY.value,
        scale.value,
      );
      translateX.value = withSpring(x, SPRING_CONFIG);
      translateY.value = withSpring(y, SPRING_CONFIG);
    });

  // ピンチとパンを同時に処理
  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  // 画像のアニメーションスタイル
  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // クロップ実行
  async function handleConfirm() {
    if (!imageUri || !imageSize) return;
    setIsCropping(true);
    try {
      const currentScale = scale.value;
      const tx = translateX.value;
      const ty = translateY.value;

      // 表示座標 → 元画像ピクセルへの変換比率
      const ratio = imageSize.width / displayWidth;

      // 円の中心を元画像の表示座標（スケール前）に変換
      const cropCenterX = displayWidth / 2 - tx / currentScale;
      const cropCenterY = displayHeight / 2 - ty / currentScale;
      const cropRadiusInDisplay = circleRadius / currentScale;

      // 元画像ピクセルでのクロップ矩形
      const originX = Math.round(
        Math.max(0, (cropCenterX - cropRadiusInDisplay) * ratio),
      );
      const originY = Math.round(
        Math.max(0, (cropCenterY - cropRadiusInDisplay) * ratio),
      );
      const cropSize = Math.round(cropRadiusInDisplay * 2 * ratio);

      // 画像境界にクランプ
      const clampedWidth = Math.min(cropSize, imageSize.width - originX);
      const clampedHeight = Math.min(cropSize, imageSize.height - originY);

      const result = await manipulateAsync(
        imageUri,
        [
          {
            crop: {
              originX,
              originY,
              width: clampedWidth,
              height: clampedHeight,
            },
          },
          { resize: { width: OUTPUT_SIZE } },
        ],
        { format: SaveFormat.JPEG, compress: 0.8 },
      );

      onConfirm(result.uri);
    } catch (error) {
      console.error('[CircularCropModal] Crop failed:', error);
    } finally {
      setIsCropping(false);
    }
  }

  if (!imageUri || !imageSize) return null;

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.container}>
          {/* ヘッダー */}
          <SafeAreaView edges={['top']} style={styles.header}>
            <Text style={styles.title}>画像を調整</Text>
            <Text style={styles.subtitle}>
              ピンチで拡大・ドラッグで移動
            </Text>
          </SafeAreaView>

          {/* クロップエリア */}
          <View style={styles.cropArea}>
            <GestureDetector gesture={composedGesture}>
              <Animated.View style={styles.gestureArea}>
                <Animated.Image
                  source={{ uri: imageUri }}
                  style={[
                    {
                      width: displayWidth,
                      height: displayHeight,
                    },
                    animatedImageStyle,
                  ]}
                  resizeMode="cover"
                />
              </Animated.View>
            </GestureDetector>

            {/* 丸形オーバーレイマスク */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <Svg width="100%" height="100%">
                <Defs>
                  <Mask id="cropMask">
                    <Rect width="100%" height="100%" fill="white" />
                    <Circle
                      cx="50%"
                      cy="50%"
                      r={circleRadius}
                      fill="black"
                    />
                  </Mask>
                </Defs>
                <Rect
                  width="100%"
                  height="100%"
                  fill="rgba(0,0,0,0.6)"
                  mask="url(#cropMask)"
                />
                <Circle
                  cx="50%"
                  cy="50%"
                  r={circleRadius}
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth={1.5}
                  fill="none"
                />
              </Svg>
            </View>
          </View>

          {/* フッター */}
          <SafeAreaView edges={['bottom']} style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={isCropping}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                isCropping && styles.buttonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={isCropping}
            >
              {isCropping ? (
                <ActivityIndicator color={colors.text.inverse} />
              ) : (
                <>
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={colors.text.inverse}
                  />
                  <Text style={styles.confirmButtonText}>使用する</Text>
                </>
              )}
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: fontSize.h3,
    fontFamily: fontFamily.semiBold,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.regular,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.3,
    marginTop: spacing.xs,
  },
  cropArea: {
    flex: 1,
    overflow: 'hidden',
  },
  gestureArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cancelButtonText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.text.primary,
    gap: spacing.xs,
  },
  confirmButtonText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    color: colors.text.inverse,
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
