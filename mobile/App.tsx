/**
 * Yomibiyori Mobile App
 * 詠日和 - 詩的SNSアプリ
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import {
  useFonts,
  NotoSerifJP_400Regular,
  NotoSerifJP_500Medium,
  NotoSerifJP_600SemiBold,
} from '@expo-google-fonts/noto-serif-jp';
import Navigation from './src/navigation';

export default function App() {
  const [fontsLoaded] = useFonts({
    NotoSerifJP_400Regular,
    NotoSerifJP_500Medium,
    NotoSerifJP_600SemiBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4A5568" />
      </View>
    );
  }

  return (
    <>
      <Navigation />
      <StatusBar style="auto" />
    </>
  );
}
