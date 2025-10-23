/**
 * Ranking Screen
 * ランキング画面 - お題ごとのランキング表示
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';

export default function RankingScreen() {

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>ランキング</Text>
        <Text style={styles.subtitle}>今日の人気作品</Text>

        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>ランキングデータがありません</Text>
          <Text style={styles.emptyStateSubtext}>
            作品が投稿されるとランキングが表示されます
          </Text>
        </View>

        {/* TODO: Display ranking list from API */}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    marginBottom: 24,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#4A5568',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
  },
  rankingList: {
    gap: 12,
  },
  rankingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4A5568',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rankText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  workInfo: {
    flex: 1,
  },
  workText: {
    fontSize: 16,
    color: '#2D3748',
    marginBottom: 4,
  },
  workAuthor: {
    fontSize: 12,
    color: '#718096',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568',
  },
});
