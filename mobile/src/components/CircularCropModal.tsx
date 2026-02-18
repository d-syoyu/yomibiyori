/**
 * Circular Crop Modal
 * 丸形クロップモーダル — プロフィール画像を丸形にトリミング
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
import { captureRef } from 'react-native-view-shot';
import { colors, spacing, fontSize, fontFamily, borderRadius } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MASK_RADIUS = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.38;
const MASK_DIAMETER = MASK_RADIUS * 2;
const MIN_SCALE = 1;
const MAX_SCALE = 4;
const SCALE_STEP = 0.25;

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
  const [isCapturing, setIsCapturing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Crop result area ref
  const cropRef = useRef<View>(null);

  // Pan offset (animated for smooth dragging)
  const pan = useRef(new Animated.ValueXY()).current;
  const panOffset = useRef({ x: 0, y: 0 });

  // Calculate image display dimensions to fill the mask area
  const getDisplayDimensions = useCallback(() => {
    if (!imageSize.width || !imageSize.height) return { width: 0, height: 0 };
    const aspectRatio = imageSize.width / imageSize.height;
    let displayWidth: number;
    let displayHeight: number;

    // Image should at minimum fill the mask diameter
    if (aspectRatio >= 1) {
      // Landscape or square
      displayHeight = MASK_DIAMETER;
      displayWidth = displayHeight * aspectRatio;
    } else {
      // Portrait
      displayWidth = MASK_DIAMETER;
      displayHeight = displayWidth / aspectRatio;
    }

    return { width: displayWidth, height: displayHeight };
  }, [imageSize]);

  // Clamp pan values so image always covers the mask
  const clampPan = useCallback(
    (x: number, y: number, currentScale: number) => {
      const { width, height } = getDisplayDimensions();
      const scaledWidth = width * currentScale;
      const scaledHeight = height * currentScale;
      const maxX = Math.max(0, (scaledWidth - MASK_DIAMETER) / 2);
      const maxY = Math.max(0, (scaledHeight - MASK_DIAMETER) / 2);
      return {
        x: Math.max(-maxX, Math.min(maxX, x)),
        y: Math.max(-maxY, Math.min(maxY, y)),
      };
    },
    [getDisplayDimensions],
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Store current offset
        panOffset.current = {
          x: (pan.x as any)._value ?? 0,
          y: (pan.y as any)._value ?? 0,
        };
      },
      onPanResponderMove: (_e, gestureState) => {
        const newX = panOffset.current.x + gestureState.dx;
        const newY = panOffset.current.y + gestureState.dy;
        pan.setValue(clampPan(newX, newY, scale));
      },
      onPanResponderRelease: () => {
        // Already clamped during move
      },
    }),
  ).current;

  // Update panResponder when scale changes
  useEffect(() => {
    const clamped = clampPan(
      (pan.x as any)._value ?? 0,
      (pan.y as any)._value ?? 0,
      scale,
    );
    pan.setValue(clamped);
  }, [scale]);

  // Reset state when modal opens with a new image
  useEffect(() => {
    if (visible && imageUri) {
      setScale(MIN_SCALE);
      pan.setValue({ x: 0, y: 0 });
      panOffset.current = { x: 0, y: 0 };
      setImageLoaded(false);

      Image.getSize(
        imageUri,
        (w, h) => setImageSize({ width: w, height: h }),
        () => setImageSize({ width: SCREEN_WIDTH, height: SCREEN_WIDTH }),
      );
    }
  }, [visible, imageUri]);

  const handleZoom = (direction: 'in' | 'out') => {
    setScale((prev) => {
      const next =
        direction === 'in'
          ? Math.min(MAX_SCALE, prev + SCALE_STEP)
          : Math.max(MIN_SCALE, prev - SCALE_STEP);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!cropRef.current) return;
    setIsCapturing(true);
    try {
      const uri = await captureRef(cropRef.current, {
        format: 'png',
        quality: 1,
        width: 400,
        height: 400,
        result: 'tmpfile',
      });
      onConfirm(uri);
    } catch (error) {
      console.error('[CircularCropModal] Capture failed:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const displayDims = getDisplayDimensions();
  const cropAreaSize = MASK_DIAMETER;

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
          {/* Hidden capture view — only the circular region */}
          <View
            ref={cropRef}
            style={[
              styles.captureArea,
              { width: cropAreaSize, height: cropAreaSize },
            ]}
            collapsable={false}
          >
            <View style={styles.captureClip}>
              <Animated.Image
                source={{ uri: imageUri ?? undefined }}
                style={{
                  width: displayDims.width * scale,
                  height: displayDims.height * scale,
                  transform: [
                    { translateX: pan.x },
                    { translateY: pan.y },
                  ],
                }}
                resizeMode="cover"
                onLoad={() => setImageLoaded(true)}
              />
            </View>
          </View>

          {/* Overlay mask — darkens area outside the circle */}
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
              {/* Circle border */}
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

          {/* Touch area for dragging (covers the crop area) */}
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
            style={[styles.confirmButton, isCapturing && styles.confirmButtonDisabled]}
            onPress={handleConfirm}
            disabled={isCapturing || !imageLoaded}
          >
            {isCapturing ? (
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
  },
  captureArea: {
    overflow: 'hidden',
    borderRadius: MASK_RADIUS,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureClip: {
    width: MASK_DIAMETER,
    height: MASK_DIAMETER,
    overflow: 'hidden',
    borderRadius: MASK_RADIUS,
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
