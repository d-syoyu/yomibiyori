/**
 * Toast Container
 * アプリ全体でToastを表示するためのコンテナ
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Toast from './Toast';
import { useToastStore } from '../stores/useToastStore';

export default function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);
  const dismissToast = useToastStore((state) => state.dismissToast);

  if (toasts.length === 0) {
    return null;
  }

  // Show only the most recent toast
  const latestToast = toasts[toasts.length - 1];

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Toast
        key={latestToast.id}
        type={latestToast.type}
        title={latestToast.title}
        message={latestToast.message}
        duration={latestToast.duration}
        onDismiss={() => dismissToast(latestToast.id)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    pointerEvents: 'box-none',
  },
});
