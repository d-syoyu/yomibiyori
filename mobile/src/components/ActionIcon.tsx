/**
 * Action Icon Component
 * アクション選択画面用のスタイリッシュなSVGアイコン
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';

export type ActionType = 'compose' | 'appreciate';

interface ActionIconProps {
  action: ActionType;
  size?: number;
  color?: string;
}

export default function ActionIcon({ action, size = 28, color = '#333333' }: ActionIconProps) {
  const renderIcon = () => {
    switch (action) {
      case 'compose':
        // 鉛筆アイコン
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <G>
              {/* 鉛筆本体 */}
              <Path
                d="M17 3L21 7L8 20H4V16L17 3Z"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              {/* 消しゴム部分の区切り線 */}
              <Path
                d="M15 5L19 9"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              {/* 芯の部分 */}
              <Path
                d="M4 16L8 20"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </G>
          </Svg>
        );

      case 'appreciate':
        // 開いた本アイコン
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <G>
              {/* 左ページ */}
              <Path
                d="M2 4C2 4 5 3 8 3C11 3 12 4 12 4V20C12 20 11 19 8 19C5 19 2 20 2 20V4Z"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              {/* 右ページ */}
              <Path
                d="M22 4C22 4 19 3 16 3C13 3 12 4 12 4V20C12 20 13 19 16 19C19 19 22 20 22 20V4Z"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              {/* 左ページの行 */}
              <Path
                d="M5 8H9"
                stroke={color}
                strokeWidth="1"
                strokeLinecap="round"
                opacity={0.5}
              />
              <Path
                d="M5 12H9"
                stroke={color}
                strokeWidth="1"
                strokeLinecap="round"
                opacity={0.5}
              />
              {/* 右ページの行 */}
              <Path
                d="M15 8H19"
                stroke={color}
                strokeWidth="1"
                strokeLinecap="round"
                opacity={0.5}
              />
              <Path
                d="M15 12H19"
                stroke={color}
                strokeWidth="1"
                strokeLinecap="round"
                opacity={0.5}
              />
            </G>
          </Svg>
        );

      default:
        return null;
    }
  };

  return <View style={styles.container}>{renderIcon()}</View>;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
