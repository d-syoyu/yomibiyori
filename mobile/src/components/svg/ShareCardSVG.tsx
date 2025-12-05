/**
 * SVG版共有カード - 短冊スタイル
 * 画像生成用の完全SVG実装
 */

import React from 'react';
import Svg, { Rect, Text as SVGText, G, Line } from 'react-native-svg';
import VerticalPoemSVG from './VerticalPoemSVG';
import type { ShareCardContent } from '../../types/share';
import { colors } from '../../theme';

interface ShareCardSVGProps {
  content: ShareCardContent;
  width?: number;
  height?: number;
}

const APP_NAME = 'よみびより';
const APP_URL = 'yomibiyori.app';

// 和紙色
const BG_WASHI = '#F5F3ED';
const CARD_WHITE = '#FFFFFF';

const ShareCardSVG: React.FC<ShareCardSVGProps> = ({
  content,
  width = 1080,
  height = 1920,
}) => {
  const categoryTheme = colors.category[content.category];
  const accentColor = categoryTheme?.primary ?? colors.category['恋愛'].primary;

  // サイズに応じたスケーリング(基準: 1080x1920)
  const scale = width / 1080;
  const padding = 48 * scale;
  const innerPadding = 40 * scale;
  const cornerRadius = 20 * scale;
  const accentBorderHeight = 12 * scale;

  // カードの座標
  const cardX = padding;
  const cardY = padding;
  const cardWidth = width - padding * 2;
  const cardHeight = height - padding * 2;

  // フッター領域
  const footerHeight = 200 * scale;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* 和紙色背景 */}
      <Rect x={0} y={0} width={width} height={height} fill={BG_WASHI} />

      {/* 白いカード本体 */}
      <Rect
        x={cardX}
        y={cardY}
        width={cardWidth}
        height={cardHeight}
        fill={CARD_WHITE}
        rx={cornerRadius}
        ry={cornerRadius}
      />

      {/* 上部アクセントボーダー（短冊風） */}
      <Rect
        x={cardX}
        y={cardY}
        width={cardWidth}
        height={accentBorderHeight}
        fill={accentColor}
        rx={cornerRadius}
        ry={cornerRadius}
      />
      {/* ボーダーの下半分を白で上書きして直線にする */}
      <Rect
        x={cardX}
        y={cardY + accentBorderHeight / 2}
        width={cardWidth}
        height={accentBorderHeight / 2}
        fill={accentColor}
      />

      <G>
        {/* バッジ */}
        {content.badgeLabel && (
          <G>
            <Rect
              x={cardX + innerPadding}
              y={cardY + innerPadding + accentBorderHeight}
              width={240 * scale}
              height={44 * scale}
              fill="rgba(0, 0, 0, 0.04)"
              rx={4 * scale}
              ry={4 * scale}
            />
            <SVGText
              x={cardX + innerPadding + 120 * scale}
              y={cardY + innerPadding + accentBorderHeight + 30 * scale}
              fontSize={18 * scale}
              fill={colors.text.secondary}
              fontWeight="500"
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
            x={cardX + innerPadding}
            y={cardY + innerPadding + accentBorderHeight + 100 * scale}
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
          y={cardY + innerPadding + accentBorderHeight + 180 * scale}
          fontSize={38 * scale}
          lineHeight={48 * scale}
          spacing={80 * scale}
          color={colors.text.primary}
          lowerBold
        />

        {/* 作者名 */}
        <SVGText
          x={cardX + innerPadding}
          y={height - padding - footerHeight}
          fontSize={22 * scale}
          fill={colors.text.secondary}
          fontWeight="500"
          fontFamily="Noto Serif JP"
        >
          @{content.displayName}
        </SVGText>

        {/* 区切り線 */}
        <Line
          x1={cardX + innerPadding}
          y1={height - padding - footerHeight + 50 * scale}
          x2={cardX + cardWidth - innerPadding}
          y2={height - padding - footerHeight + 50 * scale}
          stroke="rgba(0, 0, 0, 0.1)"
          strokeWidth={1 * scale}
        />

        {/* フッター */}
        <G>
          {/* スポンサー提供 */}
          {content.sponsorName && (
            <G>
              <SVGText
                x={cardX + innerPadding}
                y={height - padding - 80 * scale}
                fontSize={16 * scale}
                fill={colors.text.tertiary}
                fontWeight="400"
                fontFamily="Noto Serif JP"
              >
                提供
              </SVGText>
              <SVGText
                x={cardX + innerPadding + 50 * scale}
                y={height - padding - 80 * scale}
                fontSize={20 * scale}
                fill={colors.text.secondary}
                fontWeight="500"
                fontFamily="Noto Serif JP"
              >
                {content.sponsorName}
              </SVGText>
            </G>
          )}

          {/* アプリ名（右寄せ） */}
          <SVGText
            x={width - padding - innerPadding}
            y={height - padding - 90 * scale}
            fontSize={24 * scale}
            fill={colors.text.primary}
            fontWeight="600"
            textAnchor="end"
            fontFamily="Noto Serif JP"
          >
            {APP_NAME}
          </SVGText>

          {/* URL（右寄せ） */}
          <SVGText
            x={width - padding - innerPadding}
            y={height - padding - 50 * scale}
            fontSize={14 * scale}
            fill={colors.text.tertiary}
            fontWeight="400"
            textAnchor="end"
            fontFamily="Noto Serif JP"
          >
            {content.footerUrl ?? APP_URL}
          </SVGText>
        </G>
      </G>
    </Svg>
  );
};

export default ShareCardSVG;
