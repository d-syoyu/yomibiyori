import type { ThemeCategory } from './index';

export type ShareContext = 'appreciation' | 'ranking' | 'profile';

export interface ShareCardContent {
  category: ThemeCategory;
  upperText?: string;
  lowerText: string;
  displayName: string;
  dateLabel: string;
  categoryLabel: string;
  likesLabel?: string;
  scoreLabel?: string;
  badgeLabel?: string;
  caption?: string;
  footerUrl?: string;
  backgroundImageUrl?: string;
}

export interface SharePayload {
  context: ShareContext;
  workId: string;
  card: ShareCardContent;
  message: string;
}
