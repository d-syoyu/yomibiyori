/**
 * Vertical Text Component
 * 縦書きテキスト表示コンポーネント（段組み対応）
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface VerticalTextProps {
  text: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  /** 段組み方向: 'ltr' (左→右) or 'rtl' (右→左) */
  direction?: 'ltr' | 'rtl';
  /** 音節数で自動分割（例: [5, 7, 5] または [7, 7]） */
  syllables?: number[];
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
    ]}>
      {lines.map((line, lineIndex) => (
        <View key={lineIndex} style={styles.column}>
          {line.split('').map((char, charIndex) => (
            <Text key={charIndex} style={[styles.character, textStyle]}>
              {char}
            </Text>
          ))}
        </View>
      ))}
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
});
