/**
 * SVG版共有カード
 * 画像生成用の完全SVG実装
 */

import React from 'react';
import Svg, { Defs, LinearGradient as SVGLinearGradient, Rect, Stop, Text as SVGText, G } from 'react-native-svg';
import VerticalPoemSVG from './VerticalPoemSVG';
import type { ShareCardContent } from '../../types/share';
import { colors } from '../../theme';

interface ShareCardSVGProps {
  content: ShareCardContent;
  width?: number;
  height?: number;
}

const APP_NAME = 'よみびより';
const DEFAULT_GRADIENT = ['#6B7B4F', '#93A36C'] as const;

const ShareCardSVG: React.FC<ShareCardSVGProps> = ({
  content,
  width = 1080,
  height = 1920,
}) => {
  const categoryTheme = colors.category[content.category];
  const gradientColors = categoryTheme?.gradient ?? DEFAULT_GRADIENT;

  // サイズに応じたスケーリング(基準: 1080x1920)
  const scale = width / 1080;
  const padding = 40 * scale;
  const innerPadding = 32 * scale;
  const cornerRadius = 24 * scale;
  const innerRadius = 16 * scale;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <SVGLinearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={gradientColors[0]} stopOpacity="1" />
          <Stop offset="100%" stopColor={gradientColors[1]} stopOpacity="1" />
        </SVGLinearGradient>
      </Defs>

      {/* グラデーション背景 */}
      <Rect
        x={padding}
        y={padding}
        width={width - padding * 2}
        height={height - padding * 2}
        fill="url(#bgGradient)"
        rx={cornerRadius}
        ry={cornerRadius}
      />

      {/* 白背景オーバーレイ */}
      <Rect
        x={padding + innerPadding}
        y={padding + innerPadding}
        width={width - (padding + innerPadding) * 2}
        height={height - (padding + innerPadding) * 2}
        fill="rgba(255, 255, 255, 0.92)"
        rx={innerRadius}
        ry={innerRadius}
      />

      <G>
        {/* バッジ */}
        {content.badgeLabel && (
          <G>
            <Rect
              x={padding + innerPadding + 24 * scale}
              y={padding + innerPadding + 24 * scale}
              width={280 * scale}
              height={48 * scale}
              fill="rgba(26, 54, 93, 0.08)"
              rx={8 * scale}
              ry={8 * scale}
            />
            <SVGText
              x={padding + innerPadding + 164 * scale}
              y={padding + innerPadding + 48 * scale}
              fontSize={20 * scale}
              fill={colors.text.accent}
              fontWeight="600"
              textAnchor="middle"
              fontFamily="Noto Serif JP"
            >
              {content.badgeLabel}
            </SVGText>
          </G>
        )}

        {/* キャプション */}
        {content.caption && (
          <SVGText
            x={padding + innerPadding + 24 * scale}
            y={padding + innerPadding + 100 * scale}
            fontSize={18 * scale}
            fill={colors.text.secondary}
            fontWeight="500"
            fontFamily="Noto Serif JP"
          >
            {content.caption}
          </SVGText>
        )}

        {/* 縦書き詩 */}
        <VerticalPoemSVG
          upperText={content.upperText}
          lowerText={content.lowerText}
          x={width / 2 + 80 * scale}
          y={padding + innerPadding + 180 * scale}
          fontSize={36 * scale}
          lineHeight={42 * scale}
          spacing={70 * scale}
          color={colors.text.primary}
          lowerBold
        />

        {/* メタ情報エリア */}
        <G>
          {/* 作者名 */}
          <SVGText
            x={padding + innerPadding + 24 * scale}
            y={height - padding - innerPadding - 200 * scale}
            fontSize={22 * scale}
            fill={colors.text.primary}
            fontWeight="600"
            fontFamily="Noto Serif JP"
          >
            {content.displayName}
          </SVGText>

          {/* カテゴリと日付 */}
          <SVGText
            x={padding + innerPadding + 24 * scale}
            y={height - padding - innerPadding - 160 * scale}
            fontSize={16 * scale}
            fill={colors.text.tertiary}
            fontWeight="500"
            fontFamily="Noto Serif JP"
          >
            {content.categoryLabel} / {content.dateLabel}
          </SVGText>

          {/* いいね数 */}
          {content.likesLabel && (
            <SVGText
              x={width - padding - innerPadding - 24 * scale}
              y={height - padding - innerPadding - 200 * scale}
              fontSize={16 * scale}
              fill={colors.text.accent}
              fontWeight="600"
              textAnchor="end"
              fontFamily="Noto Serif JP"
            >
              {content.likesLabel}
            </SVGText>
          )}

          {/* スコア */}
          {content.scoreLabel && (
            <SVGText
              x={width - padding - innerPadding - 24 * scale}
              y={height - padding - innerPadding - 160 * scale}
              fontSize={16 * scale}
              fill={colors.status.info}
              fontWeight="600"
              textAnchor="end"
              fontFamily="Noto Serif JP"
            >
              {content.scoreLabel}
            </SVGText>
          )}
        </G>

        {/* フッター */}
        <G>
          {content.sponsorName && (
            <SVGText
              x={padding + innerPadding + 24 * scale}
              y={height - padding - innerPadding - 30 * scale}
              fontSize={18 * scale}
              fill={colors.text.primary}
              fontWeight="600"
              fontFamily="Noto Serif JP"
            >
              {content.sponsorName}
            </SVGText>
          )}
          <SVGText
            x={width - padding - innerPadding - 24 * scale}
            y={height - padding - innerPadding - 54 * scale}
            fontSize={18 * scale}
            fill={colors.text.primary}
            fontWeight="600"
            textAnchor="end"
            fontFamily="Noto Serif JP"
          >
            {APP_NAME}
          </SVGText>
          <SVGText
            x={width - padding - innerPadding - 24 * scale}
            y={height - padding - innerPadding - 30 * scale}
            fontSize={14 * scale}
            fill={colors.text.primary}
            fontWeight="600"
            textAnchor="end"
            fontFamily="Noto Serif JP"
          >
            {content.footerUrl ?? 'yomibiyori.com'}
          </SVGText>
        </G>
      </G>
    </Svg>
  );
};

export default ShareCardSVG;
