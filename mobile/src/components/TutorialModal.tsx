/**
 * Tutorial Modal Component
 * Displays app rules and usage instructions in a swipeable slide format
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ============================================================================
// Types
// ============================================================================

interface TutorialSlide {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

interface TutorialModalProps {
  visible: boolean;
  onClose: () => void;
}

// ============================================================================
// Tutorial Content
// ============================================================================

const TUTORIAL_SLIDES: TutorialSlide[] = [
  {
    id: '1',
    icon: 'time',
    title: '1日1カテゴリー1首',
    description:
      '毎朝6時に新しいお題（上の句）が出題されます。\n\n各カテゴリーにつき1日1首まで詠めます。\n\n投稿は毎晩22時に締め切られ、ランキングが確定します。\n\n限られた時間の中で、最高の一句を詠んでください。',
  },
  {
    id: '2',
    icon: 'create',
    title: '詠む',
    description:
      'お題を選んで、下の句を詠みましょう。\n\nカテゴリ選択→詠む/鑑賞する→作句の流れで進みます。\n\n心に浮かんだ言葉を、そのまま形にしてください。',
  },
  {
    id: '3',
    icon: 'heart',
    title: '鑑賞する',
    description:
      '他のユーザーの作品を読んで、いいねをつけることができます。\n\n素敵な作品に出会ったら、ハートを贈りましょう。',
  },
  {
    id: '4',
    icon: 'trophy',
    title: 'デイリーランキング',
    description:
      'いいねなどに基づいて、毎日のランキングが決まります。\n\nあなたの作品がどこまで届くか挑戦してみましょう。',
  },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// Tutorial Modal Component
// ============================================================================

export default function TutorialModal({ visible, onClose }: TutorialModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Handle scroll to update current index
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  // Navigate to next slide
  const handleNext = () => {
    if (currentIndex < TUTORIAL_SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      // Last slide - close tutorial
      handleClose();
    }
  };

  // Navigate to previous slide
  const handlePrev = () => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex - 1,
        animated: true,
      });
    }
  };

  // Close modal and reset to first slide
  const handleClose = () => {
    setCurrentIndex(0);
    onClose();
  };

  // Render individual slide
  const renderSlide = ({ item }: { item: TutorialSlide }) => (
    <View style={styles.slide}>
      <View style={styles.iconContainer}>
        <Ionicons name={item.icon} size={80} color="#4A5568" />
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Close button */}
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="close" size={28} color="#718096" />
        </TouchableOpacity>

        {/* Slides */}
        <FlatList
          ref={flatListRef}
          data={TUTORIAL_SLIDES}
          renderItem={renderSlide}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          getItemLayout={(data, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
        />

        {/* Pagination dots */}
        <View style={styles.pagination}>
          {TUTORIAL_SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        {/* Navigation buttons */}
        <View style={styles.navigation}>
          {currentIndex > 0 && (
            <TouchableOpacity style={styles.navButton} onPress={handlePrev}>
              <Ionicons name="chevron-back" size={24} color="#4A5568" />
              <Text style={styles.navButtonText}>戻る</Text>
            </TouchableOpacity>
          )}
          <View style={styles.spacer} />
          <TouchableOpacity
            style={[styles.navButton, styles.nextButton]}
            onPress={handleNext}
          >
            <Text style={[styles.navButtonText, styles.nextButtonText]}>
              {currentIndex < TUTORIAL_SLIDES.length - 1 ? '次へ' : '始める'}
            </Text>
            <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
    paddingBottom: 160,
  },
  iconContainer: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontFamily: 'NotoSerifJP_600SemiBold',
    color: '#2D3748',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 38,
  },
  description: {
    fontSize: 16,
    fontFamily: 'NotoSerifJP_400Regular',
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 28,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#4A5568',
    width: 24,
  },
  inactiveDot: {
    backgroundColor: '#CBD5E0',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  spacer: {
    flex: 1,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nextButton: {
    backgroundColor: '#4A5568',
  },
  navButtonText: {
    fontSize: 16,
    fontFamily: 'NotoSerifJP_500Medium',
    color: '#4A5568',
    marginHorizontal: 4,
  },
  nextButtonText: {
    color: '#FFFFFF',
  },
});
