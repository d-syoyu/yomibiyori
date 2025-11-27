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
    <View style={[styles.outerContainer, { backgroundColor: themeColors.primary }]}>
      <View style={styles.innerCard}>
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
                style={[
                  styles.sponsorChip,
                  (!sponsorUrl && !onSponsorPress) && styles.sponsorChipDisabled,
                ]}
              >
                <Ionicons
                  name="ribbon-outline"
                  size={14}
                  color={(sponsorUrl || onSponsorPress) ? colors.text.primary : colors.text.tertiary}
                />
                <Text
                  style={[
                    styles.sponsorText,
                    (!sponsorUrl && !onSponsorPress) && styles.sponsorTextDisabled,
                  ]}
                >
                  {sponsorName}
                </Text>
                {(sponsorUrl || onSponsorPress) && (
                  <Ionicons name="open-outline" size={14} color={colors.text.primary} />
                )}
              </TouchableOpacity>
            )}
            {extraFooterContent}
          </View>
          {customActions ?? (
            <View style={styles.actions}>
              {onShare && (
                <TouchableOpacity
                  style={styles.roundButton}
                  onPress={onShare}
                  activeOpacity={0.8}
                  accessibilityLabel="共有"
                >
                  <Ionicons name="share-outline" size={18} color={colors.text.primary} />
                </TouchableOpacity>
              )}
              {typeof likesCount === 'number' &&
                (onLike ? (
                  <TouchableOpacity
                    style={styles.likeBadge}
                    onPress={onLike}
                    activeOpacity={0.8}
                    accessibilityLabel="いいね"
                  >
                    <Ionicons name="heart" size={14} color={colors.status.error} />
                    <Text style={styles.likeText}>{likesCount}</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.likeBadge}>
                    <Ionicons name="heart" size={14} color={colors.status.error} />
                    <Text style={styles.likeText}>{likesCount}</Text>
                  </View>
                ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  outerContainer: {
    borderRadius: borderRadius.xl,
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  innerCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadow.sm,
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
  sponsorText: {
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    letterSpacing: 0.3,
  },
  sponsorTextDisabled: {
    color: colors.text.tertiary,
  },
  sponsorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(26, 54, 93, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(26, 54, 93, 0.1)',
    alignSelf: 'flex-start',
  },
  sponsorChipDisabled: {
    opacity: 0.6,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.text.primary,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  badgeText: {
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
});

export default WorkCard;

// WorkCardを表示名で識別可能にする
WorkCard.displayName = 'WorkCard';
