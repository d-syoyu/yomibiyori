/**
 * Vertical Text Component
 * 縦書きテキスト表示コンポーネント（段組み対応）
 *
 * 縦書き時に回転が必要な文字：
 * - 伸ばし棒: ー
 * - 波ダッシュ: 〜、～
 * - 三点リーダー: …、‥
 * - ハイフン・ダッシュ: −、－、–、—
 * - 括弧（一部）: 「」『』（）など
 */

import React from 'react';
import { View, Text, StyleSheet, type ViewStyle, type TextStyle, type StyleProp } from 'react-native';

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
 */
function needsRotation(char: string): boolean {
  // 伸ばし棒・ダッシュ類
  const dashChars = ['ー', '−', '－', '–', '—', 'ｰ'];

  // 波ダッシュ
  const waveChars = ['〜', '～', '〰'];

  // 三点リーダー
  const ellipsisChars = ['…', '‥', '⋯'];

  // 括弧・記号類（縦書き時に回転が必要）
  const bracketChars = [
    '（', '）', '(', ')',           // 丸括弧
    '「', '」', '『', '』',         // 鉤括弧・二重鉤括弧
    '【', '】', '〔', '〕',         // 隅付き括弧・亀甲括弧
    '［', '］', '[', ']',           // 角括弧
    '〈', '〉', '《', '》',         // 山括弧・二重山括弧
    '｛', '｝', '{', '}',           // 波括弧
    '"', '"', ''', ''',             // 全角引用符
    '"', "'",                       // 半角引用符
    ':', ';',                       // 半角コロン・セミコロン
    '：', '；',                     // 全角コロン・セミコロン
    '→', '←', '↔',                 // 矢印
    '=', '＝',                      // イコール
  ];

  // 全ての回転対象文字
  const rotationChars = [...dashChars, ...waveChars, ...ellipsisChars, ...bracketChars];

  return rotationChars.includes(char);
}

/**
 * 縦書き時に右上に位置調整が必要な文字を判定（句読点類）
 */
function needsPositionAdjustment(char: string): boolean {
  const punctuationChars = [
    '、', '，',                     // 読点
    '。', '．',                     // 句点
  ];
  return punctuationChars.includes(char);
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
            {line.split('').map((char, charIndex) => {
              const shouldRotate = needsRotation(char);
              const shouldAdjustPosition = needsPositionAdjustment(char);

              return (
                <Text
                  key={charIndex}
                  style={[
                    styles.character,
                    textStyle,
                    shouldRotate && styles.rotatedCharacter,
                    shouldAdjustPosition && styles.punctuationCharacter
                  ]}
                >
                  {char}
                </Text>
              );
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
  punctuationCharacter: {
    // 句読点を右上に配置（縦書き用位置調整）
    transform: [{ translateX: 6 }, { translateY: -6 }],
  },
});
