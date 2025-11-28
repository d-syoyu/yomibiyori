/**
 * SVG版縦書き詩コンポーネント
 * react-native-svgを使用した安定的な画像生成用
 */

import React from 'react';
import { G, Text as SVGText } from 'react-native-svg';

/**
 * 縦書き用Unicode文字への置換マップ
 * 括弧類は回転ではなく縦書き専用文字に置換
 */
const verticalCharMap: { [key: string]: string } = {
  '「': '﹁',
  '」': '﹂',
  '『': '﹃',
  '』': '﹄',
  '（': '︵',
  '）': '︶',
  '(': '︵',
  ')': '︶',
  '【': '︻',
  '】': '︼',
  '〔': '︹',
  '〕': '︺',
  '〈': '︿',
  '〉': '﹀',
  '《': '︽',
  '》': '︾',
  '［': '﹇',
  '］': '﹈',
  '[': '﹇',
  ']': '﹈',
  '｛': '︷',
  '｝': '︸',
  '{': '︷',
  '}': '︸',
};

/**
 * 縦書き用の文字に変換（置換が必要な文字のみ）
 */
const getVerticalChar = (char: string): string => {
  return verticalCharMap[char] ?? char;
};

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
 * 注: 括弧類は回転ではなく縦書き専用文字に置換するため除外
 */
const needsRotation = (char: string): boolean => {
  const rotationChars = [
    // 伸ばし棒・ダッシュ類
    'ー', '−', '－', '–', '—', 'ｰ',
    // 波ダッシュ
    '〜', '～', '〰',
    // 三点リーダー
    '…', '‥', '⋯',
    // 記号類（縦書き時に回転が必要）
    // 注: 括弧類は verticalCharMap で縦書き専用文字に置換するため除外
    // 注: 引用符は回転ではなく位置調整で対応するため除外
    ':', ';',                       // 半角コロン・セミコロン
    '：', '；',                     // 全角コロン・セミコロン
    '→', '←', '↔',                 // 矢印
    '=', '＝',                      // イコール
  ];
  return rotationChars.includes(char);
};

/**
 * 縦書き時に右上に位置調整が必要な文字（句読点）
 */
const needsPositionAdjustmentTopRight = (char: string): boolean => {
  const chars = [
    '、', '，',                     // 読点
    '。', '．',                     // 句点
  ];
  return chars.includes(char);
};

/**
 * 引用符かどうかを判定
 */
const isQuoteMark = (char: string): boolean => {
  const quoteChars = [
    '"', '"', '"',                  // ダブルクォート（開き・閉じ・ストレート）
    "'", "'", "'",                  // シングルクォート（開き・閉じ・ストレート）
  ];
  return quoteChars.includes(char);
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
    let quoteCount = 0;
    return chars.map((char, index) => {
      const charY = y + index * lineHeight;
      const rotation = needsRotation(char);
      const topRightAdjust = needsPositionAdjustmentTopRight(char);
      const displayChar = getVerticalChar(char);

      // 引用符の場合、出現順で開き（奇数）/閉じ（偶数）を判定
      let quotePosition: 'open' | 'close' | null = null;
      if (isQuoteMark(char)) {
        quoteCount++;
        quotePosition = quoteCount % 2 === 1 ? 'open' : 'close';
      }

      // 位置調整: 右上（句読点・開き引用符）または左上（閉じ引用符）
      let adjustedX = columnX;
      let adjustedY = charY;
      if (topRightAdjust || quotePosition === 'open') {
        adjustedX = columnX + fontSize * 0.3;
        adjustedY = charY - fontSize * 0.3;
      } else if (quotePosition === 'close') {
        adjustedX = columnX - fontSize * 0.3;
        adjustedY = charY - fontSize * 0.3;
      }

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
          {displayChar}
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
