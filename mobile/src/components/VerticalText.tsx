/**
 * Vertical Text Component
 * 縦書きテキスト表示コンポーネント（段組み対応）
 *
 * 縦書き時に回転が必要な文字：
 * - 伸ばし棒: ー
 * - 波ダッシュ: 〜、～
 * - 三点リーダー: …、‥
 * - ハイフン・ダッシュ: −、－、–、—
 *
 * 縦書き用Unicode文字に置換する文字：
 * - 括弧類: 「」『』（）【】〔〕〈〉《》［］｛｝
 */

import React from 'react';
import { View, Text, StyleSheet, type ViewStyle, type TextStyle, type StyleProp } from 'react-native';

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
function getVerticalChar(char: string): string {
  return verticalCharMap[char] ?? char;
}

interface VerticalTextProps {
  text: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  /** 段組み方向: 'ltr' (左→右) or 'rtl' (右→左) */
  direction?: 'ltr' | 'rtl';
  /** 音節数で自動分割（例: [5, 7, 5] または [7, 7]） */
  syllables?: number[];
}

/**
 * 縦書き時に90度回転が必要な文字を判定
 * 注: 括弧類は回転ではなく縦書き専用文字に置換するため除外
 */
function needsRotation(char: string): boolean {
  // 伸ばし棒・ダッシュ類
  const dashChars = ['ー', '−', '－', '–', '—', 'ｰ'];

  // 波ダッシュ
  const waveChars = ['〜', '～', '〰'];

  // 三点リーダー
  const ellipsisChars = ['…', '‥', '⋯'];

  // 記号類（縦書き時に回転が必要）
  // 注: 括弧類は verticalCharMap で縦書き専用文字に置換するため除外
  // 注: 引用符は回転ではなく位置調整で対応するため除外
  const symbolChars = [
    ':', ';',                       // 半角コロン・セミコロン
    '：', '；',                     // 全角コロン・セミコロン
    '→', '←', '↔',                 // 矢印
    '=', '＝',                      // イコール
  ];

  // 全ての回転対象文字
  const rotationChars = [...dashChars, ...waveChars, ...ellipsisChars, ...symbolChars];

  return rotationChars.includes(char);
}

/**
 * 縦書き時に右上に位置調整が必要な文字を判定（句読点）
 */
function needsPositionAdjustmentTopRight(char: string): boolean {
  const chars = [
    '、', '，',                     // 読点
    '。', '．',                     // 句点
  ];
  return chars.includes(char);
}

/**
 * 引用符かどうかを判定
 */
function isQuoteMark(char: string): boolean {
  const quoteChars = [
    '"', '"', '"',                  // ダブルクォート（開き・閉じ・ストレート）
    "'", "'", "'",                  // シングルクォート（開き・閉じ・ストレート）
  ];
  return quoteChars.includes(char);
}

export default function VerticalText({
  text,
  style,
  textStyle,
  direction = 'ltr',
  syllables
}: VerticalTextProps) {
  // Split text into columns
  let lines: string[];

  if (syllables) {
    // Auto-split by syllable counts
    lines = [];
    let position = 0;
    for (const count of syllables) {
      lines.push(text.slice(position, position + count));
      position += count;
    }
    // If there's remaining text, add it as the last column
    if (position < text.length) {
      lines.push(text.slice(position));
    }
  } else {
    // Split by newlines
    lines = text.split('\n');
  }

  return (
    <View style={[
      styles.container,
      direction === 'rtl' ? styles.containerRTL : styles.containerLTR,
      style
    ]}
      collapsable={false}
      renderToHardwareTextureAndroid
    >
      {lines.map((line, lineIndex) => {
        // Skip empty lines
        if (!line || line.trim().length === 0) {
          return null;
        }

        return (
          <View
            key={lineIndex}
            style={styles.column}
            collapsable={false}
          >
            {(() => {
              let quoteCount = 0;
              return line.split('').map((char, charIndex) => {
                const shouldRotate = needsRotation(char);
                const shouldAdjustTopRight = needsPositionAdjustmentTopRight(char);
                const displayChar = getVerticalChar(char);

                // 引用符の場合、出現順で開き（奇数）/閉じ（偶数）を判定
                let quotePosition: 'open' | 'close' | null = null;
                if (isQuoteMark(char)) {
                  quoteCount++;
                  quotePosition = quoteCount % 2 === 1 ? 'open' : 'close';
                }

                return (
                  <Text
                    key={charIndex}
                    style={[
                      styles.character,
                      textStyle,
                      shouldRotate && styles.rotatedCharacter,
                      shouldAdjustTopRight && styles.topRightCharacter,
                      quotePosition === 'open' && styles.topRightCharacter,
                      quotePosition === 'close' && styles.topLeftCharacter
                    ]}
                  >
                    {displayChar}
                  </Text>
                );
              });
            })()}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  containerLTR: {
    flexDirection: 'row',
  },
  containerRTL: {
    flexDirection: 'row-reverse',
  },
  column: {
    flexDirection: 'column',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  character: {
    fontSize: 18,
    lineHeight: 28,
    color: '#2D3748',
    textAlign: 'center',
  },
  rotatedCharacter: {
    transform: [{ rotate: '90deg' }],
  },
  topRightCharacter: {
    // 句読点・開き引用符を右上に配置（縦書き用位置調整）
    transform: [{ translateX: 6 }, { translateY: -6 }],
  },
  topLeftCharacter: {
    // 閉じ引用符を左上に配置（縦書き用位置調整）
    transform: [{ translateX: -6 }, { translateY: -6 }],
  },
});
