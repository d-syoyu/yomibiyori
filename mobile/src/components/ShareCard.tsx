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
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, { shadowColor }]}
    >
      <View style={styles.overlay}>
        {content.badgeLabel && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{content.badgeLabel}</Text>
          </View>
        )}

        {content.caption && (
          <Text style={styles.caption}>{content.caption}</Text>
        )}

        <VerticalPoem
          upperText={content.upperText}
          lowerText={content.lowerText}
          lowerBold
        />

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
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
  overlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    gap: spacing.md,
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
    marginTop: spacing.md,
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
    marginTop: spacing.md,
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
