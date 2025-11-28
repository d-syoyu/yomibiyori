/**
 * SVG版縦書き詩コンポーネント
 * react-native-svgを使用した安定的な画像生成用
 *
 * 引用符で囲まれた部分は横書きブロックとして90度回転表示
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
 */
const needsRotation = (char: string): boolean => {
  const rotationChars = [
    // 伸ばし棒・ダッシュ類
    'ー', '−', '－', '–', '—', 'ｰ',
    // 波ダッシュ
    '〜', '～', '〰',
    // 三点リーダー
    '…', '‥', '⋯',
    // 記号類
    ':', ';', '：', '；',
    '→', '←', '↔',
    '=', '＝',
  ];
  return rotationChars.includes(char);
};

/**
 * 縦書き時に右上に位置調整が必要な文字（句読点）
 */
const needsPositionAdjustmentTopRight = (char: string): boolean => {
  const chars = ['、', '，', '。', '．'];
  return chars.includes(char);
};

/**
 * 引用符かどうかを判定（Unicode コードポイントで判定）
 */
const isOpeningQuote = (char: string): boolean => {
  const code = char.charCodeAt(0);
  return (
    code === 0x0022 ||  // " ストレートダブル
    code === 0x0027 ||  // ' ストレートシングル
    code === 0x201C ||  // " 左ダブル引用符
    code === 0x2018     // ' 左シングル引用符
  );
};

const isClosingQuote = (char: string): boolean => {
  const code = char.charCodeAt(0);
  return (
    code === 0x0022 ||  // " ストレートダブル
    code === 0x0027 ||  // ' ストレートシングル
    code === 0x201D ||  // " 右ダブル引用符
    code === 0x2019     // ' 右シングル引用符
  );
};

/**
 * 開き引用符に対応する閉じ引用符を取得
 */
const getMatchingCloseQuote = (openQuote: string): string => {
  const code = openQuote.charCodeAt(0);
  switch (code) {
    case 0x201C: return String.fromCharCode(0x201D);
    case 0x0022: return '"';
    case 0x2018: return String.fromCharCode(0x2019);
    case 0x0027: return "'";
    default: return openQuote;
  }
};

interface TextSegment {
  type: 'normal' | 'quoted';
  content: string;
}

/**
 * テキストを引用部分と通常部分に分割
 */
const parseTextWithQuotes = (text: string): TextSegment[] => {
  const segments: TextSegment[] = [];
  let currentSegment = '';
  let inQuote = false;
  let quoteChar = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (!inQuote && isOpeningQuote(char)) {
      if (currentSegment) {
        segments.push({ type: 'normal', content: currentSegment });
        currentSegment = '';
      }
      inQuote = true;
      quoteChar = char;
      currentSegment = char;
    } else if (inQuote && isClosingQuote(char)) {
      const expectedClose = getMatchingCloseQuote(quoteChar);
      if (char === expectedClose || char === quoteChar) {
        currentSegment += char;
        segments.push({ type: 'quoted', content: currentSegment });
        currentSegment = '';
        inQuote = false;
        quoteChar = '';
      } else {
        currentSegment += char;
      }
    } else {
      currentSegment += char;
    }
  }

  if (currentSegment) {
    segments.push({ type: inQuote ? 'quoted' : 'normal', content: currentSegment });
  }

  return segments;
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
    const segments = parseTextWithQuotes(text);
    const elements: React.ReactElement[] = [];
    let currentY = y;

    segments.forEach((segment, segmentIndex) => {
      if (segment.type === 'quoted') {
        // 引用部分: 横書きテキストを90度回転
        const charCount = segment.content.length;
        const textWidth = charCount * fontSize * 0.6; // 横書きテキストの幅を推定
        const blockHeight = textWidth; // 回転後の高さ

        elements.push(
          <SVGText
            key={`quoted-${segmentIndex}`}
            x={columnX}
            y={currentY + blockHeight / 2}
            fontSize={fontSize * 0.8}
            fill={textColor}
            fontWeight={isBold ? 'bold' : fontWeight}
            textAnchor="middle"
            fontFamily="Noto Serif JP"
            transform={`rotate(90, ${columnX}, ${currentY + blockHeight / 2})`}
          >
            {segment.content}
          </SVGText>
        );

        currentY += blockHeight;
      } else {
        // 通常部分: 1文字ずつ縦に配置
        segment.content.split('').forEach((char, charIndex) => {
          const charY = currentY;
          const rotation = needsRotation(char);
          const topRightAdjust = needsPositionAdjustmentTopRight(char);
          const displayChar = getVerticalChar(char);

          let adjustedX = columnX;
          let adjustedY = charY;
          let transform: string | undefined = undefined;

          if (rotation) {
            transform = `rotate(90, ${columnX}, ${charY})`;
          } else if (topRightAdjust) {
            adjustedX = columnX + fontSize * 0.3;
            adjustedY = charY - fontSize * 0.3;
          }

          elements.push(
            <SVGText
              key={`normal-${segmentIndex}-${charIndex}`}
              x={adjustedX}
              y={adjustedY}
              fontSize={fontSize}
              fill={textColor}
              fontWeight={isBold ? 'bold' : fontWeight}
              textAnchor="middle"
              fontFamily="Noto Serif JP"
              transform={transform}
            >
              {displayChar}
            </SVGText>
          );

          currentY += lineHeight;
        });
      }
    });

    return elements;
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
