import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import VerticalPoem from './VerticalPoem';
import type { ShareCardContent } from '../types/share';
import { colors, spacing, borderRadius, fontFamily, fontSize } from '../theme';

interface ShareCardProps {
  content: ShareCardContent;
}

const APP_NAME = 'よみびより';
const DEFAULT_GRADIENT = ['#FFB7C5', '#FFE4E8'] as const;

const ShareCard: React.FC<ShareCardProps> = ({ content }) => {
  const categoryTheme = colors.category[content.category];
  const gradientColors = categoryTheme?.gradient ?? DEFAULT_GRADIENT;
  const shadowColor = categoryTheme?.shadow ?? 'rgba(0, 0, 0, 0.2)';

  return (
    <View
      style={{ width: '100%', aspectRatio: 4 / 5 }}
      collapsable={false}
      renderToHardwareTextureAndroid
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { shadowColor }]}
      >
        {/* WorkCardと同じ構造の白い内側カード */}
        <View
          style={styles.innerCard}
          collapsable={false}
          renderToHardwareTextureAndroid
        >
          {/* 詩本体 */}
          <View style={styles.poemContainer}>
            <VerticalPoem
              upperText={content.upperText}
              lowerText={content.lowerText}
              lowerBold
            />
          </View>

          {/* 投稿者名 */}
          <Text style={styles.authorText}>@{content.displayName}</Text>

          {/* 右下に「よみびより」 */}
          <Text style={styles.appName}>{APP_NAME}</Text>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
  innerCard: {
    flex: 1,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  poemContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 0,
  },
  authorText: {
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.medium,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  appName: {
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.medium,
    color: colors.text.secondary,
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
  },
});

export default ShareCard;
