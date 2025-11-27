import React from 'react';
import { View, StyleSheet } from 'react-native';
import VerticalText from './VerticalText';
import { spacing, fontFamily, fontSize, colors } from '../theme';

interface VerticalPoemProps {
  upperText?: string;
  lowerText: string;
  lowerBold?: boolean;
  maxWidth?: number;
  columnMinHeight?: number;
}

const trimText = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.replace(/^[\s\u3000]+|[\s\u3000]+$/g, '');
  return trimmed.length > 0 ? trimmed : undefined;
};

const VerticalPoem: React.FC<VerticalPoemProps> = React.memo(({
  upperText,
  lowerText,
  lowerBold = true,
  maxWidth = 280,
  columnMinHeight = 160,
}) => {
  const normalizedUpper = React.useMemo(() => trimText(upperText), [upperText]);
  const normalizedLower = React.useMemo(() => trimText(lowerText) ?? '', [lowerText]);

  return (
    <View
      style={[styles.row, { maxWidth }]}
      collapsable={false}
      renderToHardwareTextureAndroid
    >
      {normalizedUpper ? (
        <View style={[styles.column, { minHeight: columnMinHeight }]}>
          <VerticalText
            text={normalizedUpper}
            textStyle={styles.upperVerse}
            direction="rtl"
          />
        </View>
      ) : null}
      <View style={[styles.column, { minHeight: columnMinHeight }]}>
        <VerticalText
          text={normalizedLower}
          textStyle={[styles.lowerVerse, lowerBold && styles.lowerBold]}
          direction="rtl"
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignSelf: 'center',
    alignItems: 'flex-start',
    width: '100%',
    gap: spacing.lg,
  },
  column: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  upperVerse: {
    fontSize: fontSize.poem,
    lineHeight: 38,
    letterSpacing: 2,
    color: colors.text.primary,
    fontFamily: fontFamily.medium,
  },
  lowerVerse: {
    fontSize: fontSize.poem,
    lineHeight: 38,
    letterSpacing: 2,
    color: colors.text.primary,
  },
  lowerBold: {
    fontFamily: fontFamily.semiBold,
  },
});

export default VerticalPoem;

// VerticalPoemを表示名で識別可能にする
VerticalPoem.displayName = 'VerticalPoem';
