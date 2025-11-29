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
  const themeColor = categoryTheme?.primary ?? colors.category['恋愛'].primary;

  // サイズに応じたスケーリング(基準: 1080x1920)
  const scale = width / 1080;
  const padding = 60 * scale; // 余白を少し広めに
  const cardWidth = width - padding * 2;
  const cardHeight = height - padding * 2;
  const cornerRadius = 24 * scale;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* 背景（和紙色） */}
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="#F5F3ED" // colors.japaneseColors.washi
      />

      {/* カード本体（白） */}
      <G>
        {/* 影（擬似的なドロップシャドウ） */}
        <Rect
          x={padding + 4 * scale}
          y={padding + 8 * scale}
          width={cardWidth}
          height={cardHeight}
          fill="rgba(0,0,0,0.06)"
          rx={cornerRadius}
          ry={cornerRadius}
        />
        
        {/* カードベース */}
        <Rect
          x={padding}
          y={padding}
          width={cardWidth}
          height={cardHeight}
          fill="#FFFFFF"
          rx={cornerRadius}
          ry={cornerRadius}
        />

        {/* アクセントボーダー（上部） */}
        <Rect
          x={padding}
          y={padding}
          width={cardWidth}
          height={16 * scale} // 4px * 4 scale roughly
          fill={themeColor}
          rx={cornerRadius} // 上部だけ角丸にするクリッピングは複雑なので、全体に適用しつつ上から重ねる
        />
        {/* 角丸補正用の矩形（ボーダーの下側を直線にするため） */}
        <Rect
          x={padding}
          y={padding + 8 * scale}
          width={cardWidth}
          height={8 * scale}
          fill={themeColor}
        />
        
        {/* コンテンツエリア */}
        <G>
          {/* バッジ */}
          {content.badgeLabel && (
            <G>
              <Rect
                x={padding + 32 * scale}
                y={padding + 40 * scale}
                width={240 * scale}
                height={44 * scale}
                fill="rgba(0, 0, 0, 0.04)"
                rx={4 * scale}
                ry={4 * scale}
              />
              <SVGText
                x={padding + 32 * scale + 120 * scale}
                y={padding + 40 * scale + 30 * scale}
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
              x={padding + 32 * scale}
              y={padding + 120 * scale}
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
            y={padding + 240 * scale}
            fontSize={38 * scale}
            lineHeight={48 * scale}
            spacing={80 * scale}
            color={colors.text.primary}
            lowerBold
          />

          {/* メタ情報エリア */}
          <G>
            {/* 作者名 */}
            <SVGText
              x={padding + 32 * scale}
              y={height - padding - 200 * scale}
              fontSize={22 * scale}
              fill={colors.text.secondary}
              fontWeight="500"
              fontFamily="Noto Serif JP"
            >
              @{content.displayName}
            </SVGText>

            {/* 区切り線 */}
            <Rect
              x={padding + 32 * scale}
              y={height - padding - 160 * scale}
              width={cardWidth - 64 * scale}
              height={2 * scale}
              fill="rgba(0, 0, 0, 0.1)"
            />

            {/* フッター情報 */}
            <G>
              {/* スポンサー提供 */}
              {content.sponsorName && (
                <G>
                  <SVGText
                    x={padding + 32 * scale}
                    y={height - padding - 80 * scale}
                    fontSize={16 * scale}
                    fill={colors.text.tertiary}
                    fontWeight="400"
                    fontFamily="Noto Serif JP"
                  >
                    提供
                  </SVGText>
                  <SVGText
                    x={padding + 80 * scale}
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

              {/* アプリ名とURL */}
              <SVGText
                x={width - padding - 32 * scale}
                y={height - padding - 90 * scale}
                fontSize={24 * scale}
                fill={colors.text.primary}
                fontWeight="600"
                textAnchor="end"
                fontFamily="Noto Serif JP"
              >
                {APP_NAME}
              </SVGText>
              <SVGText
                x={width - padding - 32 * scale}
                y={height - padding - 50 * scale}
                fontSize={14 * scale}
                fill={colors.text.tertiary}
                fontWeight="400"
                textAnchor="end"
                fontFamily="Noto Serif JP"
              >
                yomibiyori.com
              </SVGText>
            </G>
          </G>
        </G>
      </G>
    </Svg>
  );
};

export default ShareCardSVG;
