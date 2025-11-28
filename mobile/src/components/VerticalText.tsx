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
 *
 * 引用符で囲まれた部分：
 * - 引用符も含めて全体を90度回転（横書きブロックとして表示）
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
 * 注: 引用符は引用ブロック全体で処理するため除外
 */
function needsRotation(char: string): boolean {
  // 伸ばし棒・ダッシュ類
  const dashChars = ['ー', '−', '－', '–', '—', 'ｰ'];

  // 波ダッシュ
  const waveChars = ['〜', '～', '〰'];

  // 三点リーダー
  const ellipsisChars = ['…', '‥', '⋯'];

  // 記号類（縦書き時に回転が必要）
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
 * 引用符かどうかを判定（Unicode コードポイントで判定）
 */
function isOpeningQuote(char: string): boolean {
  const code = char.charCodeAt(0);
  return (
    code === 0x0022 ||  // " ストレートダブル
    code === 0x0027 ||  // ' ストレートシングル
    code === 0x201C ||  // " 左ダブル引用符
    code === 0x2018     // ' 左シングル引用符
  );
}

function isClosingQuote(char: string): boolean {
  const code = char.charCodeAt(0);
  return (
    code === 0x0022 ||  // " ストレートダブル
    code === 0x0027 ||  // ' ストレートシングル
    code === 0x201D ||  // " 右ダブル引用符
    code === 0x2019     // ' 右シングル引用符
  );
}

/**
 * 開き引用符に対応する閉じ引用符を取得
 */
function getMatchingCloseQuote(openQuote: string): string {
  const code = openQuote.charCodeAt(0);
  switch (code) {
    case 0x201C: return String.fromCharCode(0x201D);  // " → "
    case 0x0022: return '"';   // " → "
    case 0x2018: return String.fromCharCode(0x2019);  // ' → '
    case 0x0027: return "'";   // ' → '
    default: return openQuote;
  }
}

interface TextSegment {
  type: 'normal' | 'quoted';
  content: string;
}

/**
 * テキストを引用部分と通常部分に分割
 */
function parseTextWithQuotes(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let currentSegment = '';
  let inQuote = false;
  let quoteChar = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (!inQuote && isOpeningQuote(char)) {
      // 引用開始
      if (currentSegment) {
        segments.push({ type: 'normal', content: currentSegment });
        currentSegment = '';
      }
      inQuote = true;
      quoteChar = char;
      currentSegment = char;
    } else if (inQuote && isClosingQuote(char)) {
      // 引用終了（対応する閉じ引用符かチェック）
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

  // 残りのテキスト
  if (currentSegment) {
    segments.push({ type: inQuote ? 'quoted' : 'normal', content: currentSegment });
  }

  return segments;
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

        // 引用部分と通常部分に分割
        const segments = parseTextWithQuotes(line);

        return (
          <View
            key={lineIndex}
            style={styles.column}
            collapsable={false}
          >
            {segments.map((segment, segmentIndex) => {
              if (segment.type === 'quoted') {
                // 引用部分: 全体を90度回転した横書きブロック
                // 文字数から必要なサイズを計算
                const charCount = segment.content.length;
                const textWidth = charCount * 18; // 横書きテキストの幅
                const textHeight = 28; // 横書きテキストの高さ（1行分）

                return (
                  <View
                    key={segmentIndex}
                    style={[
                      styles.quotedBlockOuter,
                      {
                        // 親レイアウト用: 回転後の見た目サイズ
                        height: textWidth,
                        width: textHeight,
                      }
                    ]}
                  >
                    <View
                      style={[
                        styles.quotedBlockInner,
                        {
                          // 回転前の実サイズ
                          width: textWidth,
                          height: textHeight,
                        }
                      ]}
                    >
                      <Text
                        style={[styles.quotedText, textStyle]}
                        numberOfLines={1}
                      >
                        {segment.content}
                      </Text>
                    </View>
                  </View>
                );
              }

              // 通常部分: 1文字ずつ縦に配置
              return segment.content.split('').map((char, charIndex) => {
                const shouldRotate = needsRotation(char);
                const shouldAdjustTopRight = needsPositionAdjustmentTopRight(char);
                const displayChar = getVerticalChar(char);

                return (
                  <Text
                    key={`${segmentIndex}-${charIndex}`}
                    style={[
                      styles.character,
                      textStyle,
                      shouldRotate && styles.rotatedCharacter,
                      shouldAdjustTopRight && styles.topRightCharacter
                    ]}
                  >
                    {displayChar}
                  </Text>
                );
              });
            })}
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
    // 句読点を右上に配置（縦書き用位置調整）
    transform: [{ translateX: 6 }, { translateY: -6 }],
  },
  quotedBlockOuter: {
    // 親レイアウト用のコンテナ（回転後のサイズを確保）
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  quotedBlockInner: {
    // 実際に回転する内側のコンテナ
    transform: [{ rotate: '90deg' }],
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  quotedText: {
    // 横書きのテキストスタイル（1行で表示）
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
    color: '#2D3748',
  },
});
