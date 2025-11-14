/**
 * ShareCard SVGプレビューコンポーネント
 * 開発時の表示確認用
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import ShareCardSVG from './ShareCardSVG';
import type { ShareCardContent } from '../../types/share';

interface ShareCardPreviewProps {
  content: ShareCardContent;
}

/**
 * 開発用プレビューコンポーネント
 * 複数サイズでの表示を確認できる
 */
const ShareCardPreview: React.FC<ShareCardPreviewProps> = ({ content }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={true}
      contentContainerStyle={styles.container}
    >
      {/* 小サイズプレビュー (1:1.78 = 9:16) */}
      <View style={styles.preview}>
        <ShareCardSVG content={content} width={180} height={320} />
      </View>

      {/* 中サイズプレビュー */}
      <View style={styles.preview}>
        <ShareCardSVG content={content} width={270} height={480} />
      </View>

      {/* アプリ表示サイズ */}
      <View style={styles.preview}>
        <ShareCardSVG content={content} width={324} height={576} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 16,
    padding: 16,
    alignItems: 'center',
  },
  preview: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden',
  },
});

export default ShareCardPreview;
