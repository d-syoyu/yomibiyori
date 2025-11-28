/**
 * SVG版縦書き詩コンポーネント
 * react-native-svgを使用した安定的な画像生成用
 */

import React from 'react';
import { G, Text as SVGText } from 'react-native-svg';

interface VerticalPoemSVGProps {
  upperText?: string;
  lowerText: string;
  x: number;
  y: number;
  fontSize?: number;
  lineHeight?: number;
  spacing?: number;
  color?: string;
  upperColor?: string;
  lowerColor?: string;
  fontWeight?: 'normal' | 'bold';
  lowerBold?: boolean;
}

/**
 * 縦書き時に90度回転が必要な文字
 */
const needsRotation = (char: string): boolean => {
  const rotationChars = [
    // 伸ばし棒・ダッシュ類
    'ー', '−', '－', '–', '—', 'ｰ',
    // 波ダッシュ
    '〜', '～', '〰',
    // 三点リーダー
    '…', '‥', '⋯',
    // 括弧類（向きを変える必要がある）
    '（', '）', '(', ')',           // 丸括弧
    '「', '」', '『', '』',         // 鉤括弧・二重鉤括弧
    '【', '】', '〔', '〕',         // 隅付き括弧・亀甲括弧
    '［', '］', '[', ']',           // 角括弧
    '〈', '〉', '《', '》',         // 山括弧・二重山括弧
    '｛', '｝', '{', '}',           // 波括弧
    '"', '"', "'", "'",             // 全角引用符
    '"', "'",                       // 半角引用符
    ':', ';',                       // 半角コロン・セミコロン
    '：', '；',                     // 全角コロン・セミコロン
    '→', '←', '↔',                 // 矢印
    '=', '＝',                      // イコール
  ];
  return rotationChars.includes(char);
};

/**
 * 縦書き時に右上に位置調整が必要な文字（句読点類）
 */
const needsPositionAdjustment = (char: string): boolean => {
  const punctuationChars = ['、', '，', '。', '．'];
  return punctuationChars.includes(char);
};

/**
 * テキストをトリム
 */
const trimText = (value?: string): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.replace(/^[\s\u3000]+|[\s\u3000]+$/g, '');
  return trimmed.length > 0 ? trimmed : undefined;
};

const VerticalPoemSVG: React.FC<VerticalPoemSVGProps> = ({
  upperText,
  lowerText,
  x,
  y,
  fontSize = 32,
  lineHeight = 38,
  spacing = 40,
  color = '#1A1A1A',
  upperColor,
  lowerColor,
  fontWeight = 'normal',
  lowerBold = true,
}) => {
  const normalizedUpper = trimText(upperText);
  const normalizedLower = trimText(lowerText) ?? '';

  const renderColumn = (
    text: string,
    columnX: number,
    isBold: boolean,
    textColor: string
  ): React.ReactElement[] => {
    const chars = text.split('');
    return chars.map((char, index) => {
      const charY = y + index * lineHeight;
      const rotation = needsRotation(char);
      const positionAdjust = needsPositionAdjustment(char);

      // 句読点は右上に位置調整
      const adjustedX = positionAdjust ? columnX + fontSize * 0.3 : columnX;
      const adjustedY = positionAdjust ? charY - fontSize * 0.3 : charY;

      return (
        <SVGText
          key={index}
          x={adjustedX}
          y={adjustedY}
          fontSize={fontSize}
          fill={textColor}
          fontWeight={isBold ? 'bold' : fontWeight}
          textAnchor="middle"
          fontFamily="Noto Serif JP"
          transform={rotation ? `rotate(90, ${adjustedX}, ${adjustedY})` : undefined}
        >
          {char}
        </SVGText>
      );
    });
  };

  return (
    <G>
      {/* 下の句（右側） */}
      <G>
        {renderColumn(
          normalizedLower,
          x,
          lowerBold,
          lowerColor ?? color
        )}
      </G>

      {/* 上の句（左側） */}
      {normalizedUpper && (
        <G>
          {renderColumn(
            normalizedUpper,
            x - spacing,
            false,
            upperColor ?? color
          )}
        </G>
      )}
    </G>
  );
};

export default VerticalPoemSVG;
