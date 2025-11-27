/**
 * Action Icon Component
 * アクション選択画面用のスタイリッシュなSVGアイコン
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, G, Circle } from 'react-native-svg';

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
        // 和筆（Japanese brush pen）- 優雅な筆のデザイン
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <G>
              {/* 筆の軸（shaft） */}
              <Path
                d="M17.5 2.5L19 4L8 15L6.5 16.5L5.5 18.5L6 19L7.5 18L9 16L20 5L21.5 6.5"
                stroke={color}
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              {/* 筆先（brush tip）- 墨が流れる様子 */}
              <Path
                d="M5.5 18.5C5.5 18.5 4 20 3.5 21C3 21.5 2.5 21.5 2.5 21.5"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              {/* 筆のグリップ部分の装飾 */}
              <Path
                d="M14 6L18 10"
                stroke={color}
                strokeWidth="1"
                strokeLinecap="round"
                opacity={0.6}
              />
              {/* 墨の滴 */}
              <Circle
                cx="4"
                cy="19.5"
                r="0.8"
                fill={color}
                opacity={0.4}
              />
            </G>
          </Svg>
        );

      case 'appreciate':
        // 花を愛でる眼 - 瞳に花が映るデザイン
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <G>
              {/* 眼の輪郭（アーモンド形） */}
              <Path
                d="M2 12C2 12 6 6 12 6C18 6 22 12 22 12C22 12 18 18 12 18C6 18 2 12 2 12Z"
                stroke={color}
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              {/* 瞳の外円 */}
              <Circle
                cx="12"
                cy="12"
                r="4"
                stroke={color}
                strokeWidth="1.2"
                fill="none"
              />
              {/* 瞳孔 */}
              <Circle
                cx="12"
                cy="12"
                r="1.5"
                fill={color}
              />
              {/* 瞳に映る花びら（5枚） */}
              <G opacity={0.6}>
                <Path
                  d="M12 8.5C12 8.5 11 9.5 12 10.5C13 9.5 12 8.5 12 8.5Z"
                  fill={color}
                />
                <Path
                  d="M15 10.5C15 10.5 13.5 10.5 13.5 12C14.5 11.5 15 10.5 15 10.5Z"
                  fill={color}
                />
                <Path
                  d="M14 14.5C14 14.5 13 13 12 13.5C13 14.5 14 14.5 14 14.5Z"
                  fill={color}
                />
                <Path
                  d="M10 14.5C10 14.5 11 13 12 13.5C11 14.5 10 14.5 10 14.5Z"
                  fill={color}
                />
                <Path
                  d="M9 10.5C9 10.5 10.5 10.5 10.5 12C9.5 11.5 9 10.5 9 10.5Z"
                  fill={color}
                />
              </G>
              {/* ハイライト */}
              <Circle
                cx="10"
                cy="10.5"
                r="0.8"
                fill="white"
                opacity={0.8}
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
