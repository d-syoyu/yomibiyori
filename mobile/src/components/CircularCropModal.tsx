/**
 * Circular Crop Modal
 * 丸形クロップモーダル — プロフィール画像を丸形にトリミング
 * expo-image-manipulator で実際にクロップを行う
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Modal,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
  PanResponder,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Circle, Defs, Mask } from 'react-native-svg';
import * as ImageManipulator from 'expo-image-manipulator';
import { colors, spacing, fontSize, fontFamily, borderRadius } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MASK_RADIUS = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.38;
const MASK_DIAMETER = MASK_RADIUS * 2;
const MIN_SCALE = 1;
const MAX_SCALE = 4;
const SCALE_STEP = 0.25;
const OUTPUT_SIZE = 400;

interface CircularCropModalProps {
  visible: boolean;
  imageUri: string | null;
  onCancel: () => void;
  onConfirm: (croppedImageUri: string) => void;
}

export default function CircularCropModal({
  visible,
  imageUri,
  onCancel,
  onConfirm,
}: CircularCropModalProps) {
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(MIN_SCALE);
  const [isProcessing, setIsProcessing] = useState(false);

  // Use refs for values accessed inside PanResponder to avoid stale closures
  const scaleRef = useRef(MIN_SCALE);
  const imageSizeRef = useRef({ width: 0, height: 0 });

  // Pan tracking
  const pan = useRef(new Animated.ValueXY()).current;
  const currentPan = useRef({ x: 0, y: 0 });
  const panOffset = useRef({ x: 0, y: 0 });

  // Keep refs in sync with state
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);
  useEffect(() => {
    imageSizeRef.current = imageSize;
  }, [imageSize]);

  const getDisplayDims = (imgSize: { width: number; height: number }) => {
    if (!imgSize.width || !imgSize.height) return { width: 0, height: 0 };
    const aspectRatio = imgSize.width / imgSize.height;
    if (aspectRatio >= 1) {
      return { width: MASK_DIAMETER * aspectRatio, height: MASK_DIAMETER };
    }
    return { width: MASK_DIAMETER, height: MASK_DIAMETER / aspectRatio };
  };

  const clamp = (x: number, y: number, s: number, imgSize: { width: number; height: number }) => {
    const dims = getDisplayDims(imgSize);
    const maxX = Math.max(0, (dims.width * s - MASK_DIAMETER) / 2);
    const maxY = Math.max(0, (dims.height * s - MASK_DIAMETER) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        panOffset.current = { ...currentPan.current };
      },
      onPanResponderMove: (_e, gs) => {
        const newX = panOffset.current.x + gs.dx;
        const newY = panOffset.current.y + gs.dy;
        const clamped = clamp(newX, newY, scaleRef.current, imageSizeRef.current);
        currentPan.current = clamped;
        pan.setValue(clamped);
      },
      onPanResponderRelease: () => {},
    }),
  ).current;

  // Re-clamp when scale changes
  useEffect(() => {
    const clamped = clamp(currentPan.current.x, currentPan.current.y, scale, imageSize);
    currentPan.current = clamped;
    pan.setValue(clamped);
  }, [scale, imageSize]);

  // Reset state when modal opens
  useEffect(() => {
    if (visible && imageUri) {
      setScale(MIN_SCALE);
      scaleRef.current = MIN_SCALE;
      currentPan.current = { x: 0, y: 0 };
      pan.setValue({ x: 0, y: 0 });
      panOffset.current = { x: 0, y: 0 };

      Image.getSize(
        imageUri,
        (w, h) => {
          setImageSize({ width: w, height: h });
          imageSizeRef.current = { width: w, height: h };
        },
        () => {
          setImageSize({ width: SCREEN_WIDTH, height: SCREEN_WIDTH });
          imageSizeRef.current = { width: SCREEN_WIDTH, height: SCREEN_WIDTH };
        },
      );
    }
  }, [visible, imageUri]);

  const handleZoom = (direction: 'in' | 'out') => {
    setScale((prev) =>
      direction === 'in'
        ? Math.min(MAX_SCALE, prev + SCALE_STEP)
        : Math.max(MIN_SCALE, prev - SCALE_STEP),
    );
  };

  const handleConfirm = async () => {
    if (!imageUri || !imageSize.width || !imageSize.height) {
      console.warn('[CircularCropModal] Cannot confirm: missing image data');
      return;
    }
    setIsProcessing(true);

    try {
      const displayDims = getDisplayDims(imageSize);

      const ratioX = imageSize.width / (displayDims.width * scale);
      const ratioY = imageSize.height / (displayDims.height * scale);

      const scaledImgW = displayDims.width * scale;
      const scaledImgH = displayDims.height * scale;

      // Center of the mask in scaled-image coordinates
      const centerX = scaledImgW / 2 - currentPan.current.x;
      const centerY = scaledImgH / 2 - currentPan.current.y;

      // Crop origin in display coords
      const cropDisplayX = centerX - MASK_RADIUS;
      const cropDisplayY = centerY - MASK_RADIUS;

      // Convert to original image coordinates
      const originX = Math.max(0, Math.round(cropDisplayX * ratioX));
      const originY = Math.max(0, Math.round(cropDisplayY * ratioY));
      const cropSize = Math.round(MASK_DIAMETER * ratioX);

      const safeWidth = Math.min(cropSize, imageSize.width - originX);
      const safeHeight = Math.min(cropSize, imageSize.height - originY);
      const safeCropSize = Math.min(safeWidth, safeHeight);

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            crop: {
              originX,
              originY,
              width: safeCropSize,
              height: safeCropSize,
            },
          },
          { resize: { width: OUTPUT_SIZE, height: OUTPUT_SIZE } },
        ],
        { compress: 0.85, format: ImageManipulator.SaveFormat.PNG },
      );

      onConfirm(result.uri);
    } catch (error) {
      console.error('[CircularCropModal] Crop failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const displayDims = getDisplayDims(imageSize);
  const hasImage = imageSize.width > 0 && imageSize.height > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={onCancel}>
            <Ionicons name="close" size={24} color={colors.text.inverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>画像を調整</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Crop Area */}
        <View style={styles.cropWrapper}>
          {/* Image layer — use Animated.View wrapping a regular Image */}
          <Animated.View
            style={[
              styles.imageContainer,
              {
                width: displayDims.width * scale,
                height: displayDims.height * scale,
                transform: [
                  { translateX: pan.x },
                  { translateY: pan.y },
                ],
              },
            ]}
          >
            {imageUri && (
              <Image
                source={{ uri: imageUri }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            )}
          </Animated.View>

          {/* Overlay mask */}
          <View style={styles.maskContainer} pointerEvents="none">
            <Svg
              width={SCREEN_WIDTH}
              height={SCREEN_WIDTH}
              viewBox={`0 0 ${SCREEN_WIDTH} ${SCREEN_WIDTH}`}
            >
              <Defs>
                <Mask id="circleMask">
                  <Rect width={SCREEN_WIDTH} height={SCREEN_WIDTH} fill="white" />
                  <Circle
                    cx={SCREEN_WIDTH / 2}
                    cy={SCREEN_WIDTH / 2}
                    r={MASK_RADIUS}
                    fill="black"
                  />
                </Mask>
              </Defs>
              <Rect
                width={SCREEN_WIDTH}
                height={SCREEN_WIDTH}
                fill="rgba(0,0,0,0.6)"
                mask="url(#circleMask)"
              />
              <Circle
                cx={SCREEN_WIDTH / 2}
                cy={SCREEN_WIDTH / 2}
                r={MASK_RADIUS}
                stroke="rgba(255,255,255,0.5)"
                strokeWidth={2}
                fill="none"
              />
            </Svg>
          </View>

          {/* Touch area for dragging */}
          <View style={styles.touchArea} {...panResponder.panHandlers} />
        </View>

        {/* Zoom Controls */}
        <View style={styles.zoomControls}>
          <TouchableOpacity
            style={[styles.zoomButton, scale <= MIN_SCALE && styles.zoomButtonDisabled]}
            onPress={() => handleZoom('out')}
            disabled={scale <= MIN_SCALE}
          >
            <Ionicons
              name="remove"
              size={24}
              color={scale <= MIN_SCALE ? 'rgba(255,255,255,0.3)' : colors.text.inverse}
            />
          </TouchableOpacity>

          <View style={styles.scaleIndicator}>
            <Text style={styles.scaleText}>{Math.round(scale * 100)}%</Text>
          </View>

          <TouchableOpacity
            style={[styles.zoomButton, scale >= MAX_SCALE && styles.zoomButtonDisabled]}
            onPress={() => handleZoom('in')}
            disabled={scale >= MAX_SCALE}
          >
            <Ionicons
              name="add"
              size={24}
              color={scale >= MAX_SCALE ? 'rgba(255,255,255,0.3)' : colors.text.inverse}
            />
          </TouchableOpacity>
        </View>

        {/* Confirm Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.confirmButton, (isProcessing || !hasImage) && styles.confirmButtonDisabled]}
            onPress={handleConfirm}
            disabled={isProcessing || !hasImage}
          >
            {isProcessing ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <Text style={styles.confirmButtonText}>この画像を使用</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    color: colors.text.inverse,
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 32,
  },
  cropWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  maskContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  touchArea: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
  zoomButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomButtonDisabled: {
    opacity: 0.4,
  },
  scaleIndicator: {
    minWidth: 60,
    alignItems: 'center',
  },
  scaleText: {
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.regular,
    color: 'rgba(255,255,255,0.7)',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.select({ ios: spacing.md, android: spacing.lg }),
  },
  confirmButton: {
    backgroundColor: colors.text.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    color: colors.text.inverse,
    letterSpacing: 0.5,
  },
});
