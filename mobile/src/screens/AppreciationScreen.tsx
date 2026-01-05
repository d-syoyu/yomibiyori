/**
 * Appreciation Screen
 * 鑑賞画面 - 他のユーザーの作品を鑑賞する
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, CommonActions, useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList, ThemeCategory, Work, Theme, RootStackParamList } from '../types';
import type { SharePayload } from '../types/share';
import api from '../services/api';
import VerticalText from '../components/VerticalText';
import CategoryIcon from '../components/CategoryIcon';
import WorkCard from '../components/WorkCard';
import ShareSheet from '../components/ShareSheet';
import { useThemeStore } from '../stores/useThemeStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useApiErrorHandler } from '../hooks/useApiErrorHandler';
import { colors, spacing, borderRadius, shadow, fontSize, fontFamily } from '../theme';
import { trackEvent, EventNames } from '../utils/analytics';
import { getViewerHash } from '../utils/viewerHash';
import { createAppreciationSharePayload } from '../utils/share';

type Props = NativeStackScreenProps<HomeStackParamList, 'Appreciation'>;
type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CATEGORIES: ThemeCategory[] = ['恋愛', '季節', '日常', 'ユーモア'];
const IMPRESSION_BATCH_LIMIT = 20;

export default function AppreciationScreen({ route }: Props) {
  const navigation = useNavigation();
  const rootNavigation = useNavigation<RootNavigationProp>();
  const getTodayTheme = useThemeStore(state => state.getTodayTheme);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const { handleError } = useApiErrorHandler();

  const [selectedCategory, setSelectedCategory] = useState<ThemeCategory>(
    route.params?.category || '恋愛'
  );
  const [works, setWorks] = useState<Work[]>([]);
  const [themesMap, setThemesMap] = useState<Map<string, Theme>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentThemeId, setCurrentThemeId] = useState<string | null>(null);
  const [sharePayload, setSharePayload] = useState<SharePayload | null>(null);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [likedStates, setLikedStates] = useState<Map<string, boolean>>(new Map());
  const [likingInProgress, setLikingInProgress] = useState<Set<string>>(new Set());
  const impressionsLoggedRef = useRef<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      trackEvent(EventNames.SCREEN_VIEWED, {
        screen_name: 'Appreciation',
        category: selectedCategory,
      });
    }, [selectedCategory])
  );

  // 印象記録をバックグラウンドで実行（UIをブロックしない）
  const recordImpressionsForWorks = useCallback((worksList: Work[]) => {
    if (!worksList.length) {
      return;
    }

    // 非同期でバックグラウンド実行
    (async () => {
      try {
        const viewerHash = await getViewerHash();
        const pendingWorks = worksList
          .filter(work => !impressionsLoggedRef.current.has(work.id))
          .slice(0, IMPRESSION_BATCH_LIMIT);

        if (!pendingWorks.length) {
          return;
        }

        // バックグラウンドで並列実行
        await Promise.all(
          pendingWorks.map(work =>
            api
              .recordWorkImpression(work.id, {
                viewer_hash: viewerHash,
                count: 1,
              })
              .then(() => {
                impressionsLoggedRef.current.add(work.id);
              })
              .catch(error => {
                // エラーはログのみで続行（UIに影響を与えない）
                console.warn('[AppreciationScreen] Impression failed for:', work.id);
              })
          )
        );
      } catch (error) {
        // 全体エラーもログのみで続行
        console.error('[AppreciationScreen] Impression tracking failed:', error);
      }
    })();
  }, []);

  // Load works for the selected category
  const loadWorks = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const newThemesMap = new Map<string, Theme>();

      // Get theme and works for selected category (using cached store)
      const theme = await getTodayTheme(selectedCategory);
      setCurrentThemeId(theme.id);
      newThemesMap.set(theme.id, theme);

      // Track theme viewed event
      trackEvent(EventNames.THEME_VIEWED, {
        theme_id: theme.id,
        category: theme.category,
      });

      const worksData = await api.getWorksByTheme(theme.id, { limit: 50, order_by: 'fair_score' });
      setWorks(worksData);

      setThemesMap(newThemesMap);
      void recordImpressionsForWorks(worksData);

      // Fetch like statuses for all works (only if authenticated)
      if (isAuthenticated && worksData.length > 0) {
        try {
          const workIds = worksData.map(w => w.id);
          const likeStatusResponse = await api.getLikeStatusBatch(workIds);
          const newLikedStates = new Map<string, boolean>();
          likeStatusResponse.items.forEach(item => {
            newLikedStates.set(item.work_id, item.liked);
          });
          setLikedStates(newLikedStates);
        } catch (error) {
          console.warn('[AppreciationScreen] Failed to fetch like statuses:', error);
        }
      }
    } catch (error: any) {
      handleError(error, 'work_fetching');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedCategory, getTodayTheme, handleError, recordImpressionsForWorks, isAuthenticated]);

  // Load works when category changes
  useEffect(() => {
    loadWorks();
  }, [loadWorks]);

  // Handle like action - optimistic update for liked state only
  const handleLike = async (workId: string) => {
    // Prevent double-tap while request is in progress
    if (likingInProgress.has(workId)) {
      return;
    }

    // Check authentication before allowing like
    if (!isAuthenticated) {
      navigation.dispatch(
        CommonActions.navigate({
          name: 'Login',
        })
      );
      return;
    }

    // Mark as in progress
    setLikingInProgress(prev => new Set(prev).add(workId));

    // Get current state for rollback
    const currentLiked = likedStates.get(workId) ?? false;

    // Optimistic update: toggle liked state immediately
    const newLiked = !currentLiked;
    setLikedStates(prev => {
      const next = new Map(prev);
      next.set(workId, newLiked);
      return next;
    });

    try {
      const response = await api.toggleLike(workId);

      // Update liked state based on server response
      setLikedStates(prev => {
        const next = new Map(prev);
        next.set(workId, response.status === 'liked');
        return next;
      });
    } catch (error: any) {
      // Rollback on error
      setLikedStates(prev => {
        const next = new Map(prev);
        next.set(workId, currentLiked);
        return next;
      });

      handleError(error, 'like_action');
    } finally {
      // Clear in progress flag
      setLikingInProgress(prev => {
        const next = new Set(prev);
        next.delete(workId);
        return next;
      });
    }
  };

  const handleRefresh = () => {
    loadWorks(true);
  };

  const openShareSheet = useCallback((work: Work) => {
    const theme = themesMap.get(work.theme_id);
    const payload = createAppreciationSharePayload(work, theme);
    setSharePayload(payload);
    setShareSheetVisible(true);
  }, [themesMap]);

  const closeShareSheet = useCallback(() => {
    setShareSheetVisible(false);
    setSharePayload(null);
  }, []);

  const handleAuthorPress = useCallback((userId: string, displayName: string) => {
    trackEvent('author_profile_clicked', {
      user_id: userId,
      context: 'appreciation',
    });
    rootNavigation.navigate('UserProfile', { userId, displayName });
  }, [rootNavigation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* ヘッダーとカテゴリフィルター */}
        <View style={styles.header}>
          <Text style={styles.title}>鑑賞</Text>

          <View style={styles.categorySelector}>
            {CATEGORIES.map((category) => {
              const categoryColors = colors.category[category];
              const isSelected = selectedCategory === category;
              return (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    isSelected && {
                      borderColor: categoryColors.primary,
                      backgroundColor: categoryColors.gradient[1],
                    },
                  ]}
                  onPress={() => setSelectedCategory(category)}
                  activeOpacity={0.8}
                >
                  <CategoryIcon
                    category={category}
                    size={24}
                    color={isSelected ? colors.text.primary : colors.text.secondary}
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      isSelected && styles.categoryTextActive,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Theme info now handled within each work card */}
        </View>

        {/* 作品リスト（仮想化されたスクロール） */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A5568" />
            <Text style={styles.loadingText}>作品を読み込み中...</Text>
          </View>
        ) : works.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>作品がありません</Text>
            <Text style={styles.emptyStateSubtext}>
              まだ誰も作品を投稿していません
            </Text>
          </View>
        ) : (
          <FlatList
            data={works}
            keyExtractor={(item) => item.id}
            renderItem={({ item: work }) => {
              const theme = themesMap.get(work.theme_id);
              return (
                <WorkCard
                  upperText={theme?.text}
                  lowerText={work.text}
                  category={theme?.category ?? '恋愛'}
                  displayName={work.display_name}
                  userId={work.user_id}
                  profileImageUrl={work.profile_image_url}
                  onAuthorPress={handleAuthorPress}
                  liked={likedStates.get(work.id) ?? false}
                  onLike={() => handleLike(work.id)}
                  onShare={() => openShareSheet(work)}
                  sponsorName={theme?.sponsored ? theme.sponsor_company_name : undefined}
                  sponsorUrl={theme?.sponsor_official_url}
                  onSponsorPress={() => {
                    if (!theme?.sponsor_company_name || !theme?.sponsor_official_url) {
                      return;
                    }
                    trackEvent(EventNames.SPONSOR_LINK_CLICKED, {
                      theme_id: theme.id,
                      sponsor_name: theme.sponsor_company_name,
                      url: theme.sponsor_official_url,
                      context: 'appreciation',
                    });
                    Linking.openURL(theme.sponsor_official_url);
                  }}
                />
              );
            }}
            ListHeaderComponent={
              <Text style={styles.sectionTitle}>
                {selectedCategory}の作品
              </Text>
            }
            contentContainerStyle={styles.worksSection}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
            }
            // パフォーマンス最適化オプション
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            windowSize={5}
            removeClippedSubviews={true}
            updateCellsBatchingPeriod={50}
          />
        )}

        <ShareSheet
          visible={shareSheetVisible}
          payload={sharePayload}
          onClose={closeShareSheet}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
  },
  title: {
    fontSize: fontSize.h1,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.md,
    letterSpacing: 2,
  },
  categorySelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  categoryButton: {
    flex: 1,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadow.sm,
  },
  categoryText: {
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.medium,
    color: colors.text.primary,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  categoryTextActive: {
    color: colors.text.primary,
    fontFamily: fontFamily.semiBold,
  },
  worksSection: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.h3,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.md,
    letterSpacing: 1,
  },
  loadingContainer: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    ...shadow.sm,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    color: colors.text.tertiary,
  },
  emptyState: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    ...shadow.sm,
  },
  emptyStateText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.medium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  emptyStateSubtext: {
    fontSize: fontSize.bodySmall,
    fontFamily: fontFamily.regular,
    color: colors.text.tertiary,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
