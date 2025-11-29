import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type GestureResponderEvent,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import VerticalPoem from './VerticalPoem';
import type { ThemeCategory } from '../types';
import { colors, spacing, borderRadius, shadow, fontFamily, fontSize } from '../theme';

interface WorkCardProps {
  upperText?: string;
  lowerText: string;
  category: ThemeCategory;
  displayName: string;
  sponsorName?: string;
  sponsorUrl?: string;
  onSponsorPress?: () => void;
  likesCount?: number;
  liked?: boolean;
  onLike?: (event: GestureResponderEvent) => void;
  onShare?: (event: GestureResponderEvent) => void;
  extraFooterContent?: React.ReactNode;
  customActions?: React.ReactNode;
  badgeLabel?: string;
}

const DEFAULT_CATEGORY: ThemeCategory = '恋愛';

const WorkCard: React.FC<WorkCardProps> = React.memo(({
  upperText,
  lowerText,
  category,
  displayName,
  sponsorName,
  sponsorUrl,
  onSponsorPress,
  likesCount,
  liked,
  onLike,
  onShare,
  extraFooterContent,
  customActions,
  badgeLabel,
}) => {
  const themeColors = colors.category[category] ?? colors.category[DEFAULT_CATEGORY];

  const handleSponsorPress = async () => {
    if (onSponsorPress) {
      onSponsorPress();
      return;
    }
    if (!sponsorUrl) {
      return;
    }
    try {
      const canOpen = await Linking.canOpenURL(sponsorUrl);
      if (canOpen) {
        await Linking.openURL(sponsorUrl);
      }
    } catch (error) {
      console.warn('[WorkCard] Failed to open sponsor URL', error);
    }
  };

  return (
    <View style={[styles.card, { borderTopColor: themeColors.primary }]}>
      {badgeLabel && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{badgeLabel}</Text>
        </View>
      )}

      <VerticalPoem
        upperText={upperText}
        lowerText={lowerText}
        lowerBold
        maxWidth={320}
        columnMinHeight={200}
      />

      <Text style={styles.authorText}>@{displayName}</Text>

      <View style={styles.divider} />

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          {sponsorName && (
            <TouchableOpacity
              onPress={handleSponsorPress}
              disabled={!sponsorUrl && !onSponsorPress}
              activeOpacity={0.7}
              accessibilityRole="link"
              accessibilityLabel={`スポンサー: ${sponsorName}`}
              style={styles.sponsorContainer}
            >
              <Text style={styles.sponsorLabel}>提供</Text>
              <Text style={[
                styles.sponsorName,
                (sponsorUrl || onSponsorPress) && styles.sponsorNameLink
              ]}>
                {sponsorName}
              </Text>
            </TouchableOpacity>
          )}
          {extraFooterContent}
        </View>
        {customActions ?? (
          <View style={styles.actions}>
            {onShare && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={onShare}
                activeOpacity={0.6}
                accessibilityLabel="共有"
              >
                <Ionicons name="share-outline" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            )}
            {onLike ? (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={onLike}
                activeOpacity={0.6}
                accessibilityLabel={liked ? "いいねを取り消す" : "いいね"}
              >
                <Ionicons
                  name={liked ? "heart" : "heart-outline"}
                  size={20}
                  color={liked ? colors.status.error : colors.text.secondary}
                />
              </TouchableOpacity>
            ) : typeof likesCount === 'number' && (
              <View style={styles.likeBadge}>
                <Ionicons name="heart" size={14} color={colors.status.error} />
                <Text style={styles.likeText}>{likesCount}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderTopWidth: 4,
    ...shadow.sm,
    // 紙の質感を出すための微細な影調整
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  authorText: {
    marginTop: spacing.md,
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.medium,
    color: colors.text.secondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.background.secondary,
    marginVertical: spacing.md,
    opacity: 0.6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  footerLeft: {
    flex: 1,
    gap: spacing.xs,
  },
  sponsorContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  sponsorLabel: {
    fontSize: 10,
    color: colors.text.tertiary,
    fontFamily: fontFamily.regular,
  },
  sponsorName: {
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.medium,
    color: colors.text.secondary,
  },
  sponsorNameLink: {
    textDecorationLine: 'underline',
    textDecorationColor: colors.text.tertiary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.8,
  },
  likeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.secondary,
  },
  likeText: {
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.semiBold,
    color: colors.status.error,
  },
  badgeContainer: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginBottom: spacing.sm,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: fontFamily.medium,
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
});

export default WorkCard;

// WorkCardを表示名で識別可能にする
WorkCard.displayName = 'WorkCard';
