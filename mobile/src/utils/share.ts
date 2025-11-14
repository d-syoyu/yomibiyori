import type { RankingEntry, Theme, ThemeCategory, Work } from '../types';
import type { SharePayload } from '../types/share';

export const SHARE_URL = 'https://yomibiyori.com';
const HASH_TAG = '#よみびより';
const FALLBACK_CATEGORY = '����' as ThemeCategory;

const ensureAtPrefixed = (displayName?: string): string => {
  if (!displayName) {
    return '@詠み人';
  }
  const trimmed = displayName.trim();
  if (!trimmed) {
    return '@詠み人';
  }
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
};

const formatDateLabel = (primary?: string, fallback?: string): string => {
  const source = primary || fallback;
  if (source && /^\d{4}-\d{2}-\d{2}/.test(source)) {
    return source.slice(0, 10);
  }

  if (source) {
    const parsed = new Date(source);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }

  const today = new Date();
  return today.toISOString().slice(0, 10);
};

const formatLikesLabel = (likes?: number): string | undefined => {
  if (typeof likes === 'number' && likes > 0) {
    return `♡ ${likes}`;
  }
  return undefined;
};

export const createAppreciationSharePayload = (work: Work, theme?: Theme): SharePayload => {
  const category = theme?.category ?? FALLBACK_CATEGORY;
  return {
    context: 'appreciation',
    workId: work.id,
    message: `今日の一首を ${HASH_TAG} で鑑賞しました。\n${SHARE_URL}`,
    card: {
      category,
      upperText: theme?.text,
      lowerText: work.text,
      displayName: ensureAtPrefixed(work.display_name),
      dateLabel: formatDateLabel(theme?.date, work.created_at),
      categoryLabel: theme?.category ?? '作品',
      likesLabel: formatLikesLabel(work.likes_count),
      caption: '今日の一首',
      footerUrl: 'yomibiyori.com',
    },
  };
};

export const createRankingSharePayload = (entry: RankingEntry, theme: Theme): SharePayload => {
  const rankBadge = `本日の${theme.category}部門 ${entry.rank}位`;
  const scoreValue = Math.round(entry.score * 100);

  return {
    context: 'ranking',
    workId: entry.work_id,
    message: `今日のランキング${entry.rank}位の句です（${theme.category}部門）。\n${HASH_TAG}\n${SHARE_URL}`,
    card: {
      category: theme.category,
      upperText: theme.text,
      lowerText: entry.text,
      displayName: ensureAtPrefixed(entry.display_name),
      dateLabel: formatDateLabel(theme.date),
      categoryLabel: theme.category,
      likesLabel: undefined,
      scoreLabel: `共鳴スコア：${scoreValue}`,
      caption: '今日のランキング',
      badgeLabel: rankBadge,
      footerUrl: 'yomibiyori.com',
    },
  };
};

export const createProfileSharePayload = (work: Work, theme?: Theme): SharePayload => {
  const category = theme?.category ?? FALLBACK_CATEGORY;
  return {
    context: 'profile',
    workId: work.id,
    message: `今日の一首を ${HASH_TAG} で詠みました。\n${SHARE_URL}`,
    card: {
      category,
      upperText: theme?.text,
      lowerText: work.text,
      displayName: ensureAtPrefixed(work.display_name),
      dateLabel: formatDateLabel(theme?.date, work.created_at),
      categoryLabel: theme?.category ?? '作品',
      likesLabel: formatLikesLabel(work.likes_count),
      caption: '今日の一首',
      footerUrl: 'yomibiyori.com',
    },
  };
};
