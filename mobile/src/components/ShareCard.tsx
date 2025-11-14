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
          {/* バッジ（オプション） */}
          {content.badgeLabel && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{content.badgeLabel}</Text>
            </View>
          )}

          {/* キャプション（オプション） */}
          {content.caption && (
            <Text style={styles.caption}>{content.caption}</Text>
          )}

          {/* 詩本体 - WorkCardと同じVerticalPoemを使用 */}
          <View style={styles.poemContainer}>
            <VerticalPoem
              upperText={content.upperText}
              lowerText={content.lowerText}
              lowerBold
            />
          </View>

          {/* 投稿者名 - WorkCardと同じスタイル */}
          <Text style={styles.authorText}>@{content.displayName}</Text>

          {/* 区切り線 */}
          <View style={styles.divider} />

          {/* フッター情報 */}
          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              <Text style={styles.metaText}>
                {content.categoryLabel} / {content.dateLabel}
              </Text>
              <Text style={styles.appName}>{APP_NAME}</Text>
            </View>
            <View style={styles.footerRight}>
              {content.likesLabel && (
                <Text style={styles.likesLabel}>{content.likesLabel}</Text>
              )}
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
  badgeContainer: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(26, 54, 93, 0.08)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
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
    marginTop: spacing.xs,
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
  divider: {
    height: 1,
    backgroundColor: colors.background.secondary,
    marginVertical: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  footerLeft: {
    flex: 1,
    gap: spacing.xs,
  },
  footerRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.medium,
    color: colors.text.tertiary,
  },
  appName: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    letterSpacing: 1,
  },
  likesLabel: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.text.accent,
  },
  urlText: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.medium,
    color: colors.text.primary,
  },
});

export default ShareCard;
