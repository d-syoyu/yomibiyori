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
const DEFAULT_GRADIENT = ['#6B7B4F', '#93A36C'] as const;

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
        <View
          style={styles.overlay}
          collapsable={false}
          renderToHardwareTextureAndroid
        >
        {/* 上部：バッジとキャプション */}
        <View style={styles.topSection}>
          {content.badgeLabel && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{content.badgeLabel}</Text>
            </View>
          )}

          {content.caption && (
            <Text style={styles.caption}>{content.caption}</Text>
          )}
        </View>

        {/* 中央：詩 */}
        <View style={styles.poemSection}>
          <View style={styles.poemWrapper}>
            <VerticalPoem
              upperText={content.upperText}
              lowerText={content.lowerText}
              lowerBold
              maxWidth={180}
              columnMinHeight={0}
            />
          </View>
        </View>

        {/* 下部：メタ情報とフッター */}
        <View style={styles.bottomSection}>
          <View style={styles.metaRow}>
            <View style={styles.metaColumn}>
              <Text style={styles.author}>{content.displayName}</Text>
              <Text style={styles.metaText}>
                {content.categoryLabel} / {content.dateLabel}
              </Text>
            </View>
            <View style={styles.statColumn}>
              {content.likesLabel && (
                <Text style={styles.statText}>{content.likesLabel}</Text>
              )}
              {content.scoreLabel && (
                <Text style={[styles.statText, styles.scoreText]}>{content.scoreLabel}</Text>
              )}
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.appName}>{APP_NAME}</Text>
            <Text style={styles.urlText}>{content.footerUrl ?? 'yomibiyori.com'}</Text>
          </View>
        </View>
      </View>
    </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  topSection: {
    gap: spacing.sm,
    flexShrink: 0,
  },
  poemSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 0,
  },
  poemWrapper: {
    maxHeight: '100%',
    transform: [{ scale: 0.85 }], // 詩全体を85%に縮小
  },
  bottomSection: {
    gap: spacing.md,
    flexShrink: 0,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(26, 54, 93, 0.08)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.text.accent,
    letterSpacing: 0.5,
  },
  caption: {
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.medium,
    color: colors.text.secondary,
    letterSpacing: 1,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  metaColumn: {
    flex: 1,
  },
  author: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  metaText: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.medium,
    color: colors.text.tertiary,
    letterSpacing: 0.5,
  },
  statColumn: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statText: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.text.accent,
  },
  scoreText: {
    color: colors.status.info,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  appName: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    letterSpacing: 1,
  },
  urlText: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    letterSpacing: 1,
  },
});

export default ShareCard;
