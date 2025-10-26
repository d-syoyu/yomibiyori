/**
 * Category Icon Component
 * 和風デザインのカテゴリーアイコン
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';
import type { ThemeCategory } from '../types';

interface CategoryIconProps {
  category: ThemeCategory;
  size?: number;
  color?: string;
}

export default function CategoryIcon({ category, size = 24, color = '#6B7B4F' }: CategoryIconProps) {
  const renderIcon = () => {
    switch (category) {
      case '恋愛':
        // 結び文様（musubi pattern）をベースにしたハート
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 21C12 21 4 15 4 9.5C4 7.5 5.5 6 7.5 6C9 6 10.5 7 11.5 8C12 8.5 12 8.5 12.5 8C13.5 7 15 6 16.5 6C18.5 6 20 7.5 20 9.5C20 15 12 21 12 21Z"
              stroke={color}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Circle cx="9" cy="10" r="1" fill={color} />
            <Circle cx="15" cy="10" r="1" fill={color} />
          </Svg>
        );

      case '季節':
        // 桜の花びら
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <G>
              {/* Center circle */}
              <Circle cx="12" cy="12" r="2" fill={color} />
              {/* Five petals */}
              <Path
                d="M12 6C12 6 10.5 8 12 10C13.5 8 12 6 12 6Z"
                fill={color}
                stroke={color}
                strokeWidth="0.5"
              />
              <Path
                d="M17.2 9C17.2 9 14.8 9.8 15.5 12C17 11 17.2 9 17.2 9Z"
                fill={color}
                stroke={color}
                strokeWidth="0.5"
              />
              <Path
                d="M15.8 16C15.8 16 14 14 12 14.5C13 16.5 15.8 16 15.8 16Z"
                fill={color}
                stroke={color}
                strokeWidth="0.5"
              />
              <Path
                d="M8.2 16C8.2 16 10 14 12 14.5C11 16.5 8.2 16 8.2 16Z"
                fill={color}
                stroke={color}
                strokeWidth="0.5"
              />
              <Path
                d="M6.8 9C6.8 9 9.2 9.8 8.5 12C7 11 6.8 9 6.8 9Z"
                fill={color}
                stroke={color}
                strokeWidth="0.5"
              />
            </G>
          </Svg>
        );

      case '日常':
        // 湯呑み（茶碗）
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path
              d="M6 9C6 9 6 7 8 7H16C18 7 18 9 18 9L17 17C17 18.5 15.5 19 14 19H10C8.5 19 7 18.5 7 17L6 9Z"
              stroke={color}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {/* Steam lines */}
            <Path
              d="M9 5C9 5 9 4 9.5 4"
              stroke={color}
              strokeWidth="1"
              strokeLinecap="round"
            />
            <Path
              d="M12 4.5C12 4.5 12 3.5 12.5 3.5"
              stroke={color}
              strokeWidth="1"
              strokeLinecap="round"
            />
            <Path
              d="M15 5C15 5 15 4 15.5 4"
              stroke={color}
              strokeWidth="1"
              strokeLinecap="round"
            />
            {/* Pattern on cup */}
            <Path
              d="M8 12H16"
              stroke={color}
              strokeWidth="0.5"
              strokeLinecap="round"
            />
          </Svg>
        );

      case 'ユーモア':
        // 笑顔（和風表現）
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Circle
              cx="12"
              cy="12"
              r="9"
              stroke={color}
              strokeWidth="1.5"
              fill="none"
            />
            {/* Eyes - curved lines (Japanese style) */}
            <Path
              d="M8 10C8.5 9.5 9.5 9.5 10 10"
              stroke={color}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <Path
              d="M14 10C14.5 9.5 15.5 9.5 16 10"
              stroke={color}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* Smile */}
            <Path
              d="M8 13.5C9 15.5 11 16 12 16C13 16 15 15.5 16 13.5"
              stroke={color}
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Cheeks */}
            <Circle cx="7.5" cy="13" r="1" fill={color} opacity="0.3" />
            <Circle cx="16.5" cy="13" r="1" fill={color} opacity="0.3" />
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
