/**
 * LoadingScreen - アプリ起動時のローディング画面
 * シンプルなデザインでロゴとアプリ名を表示
 */

import React from 'react';
import { View, Image, ActivityIndicator, StyleSheet } from 'react-native';

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/splash-icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator
        size="small"
        color="#6B7B4F"
        style={styles.loader}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 180,
    height: 180,
  },
  loader: {
    marginTop: 32,
  },
});
