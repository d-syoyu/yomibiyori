/**
 * Prefecture Picker Component
 * 都道府県を選択するピッカー
 */

import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { PREFECTURES } from '../constants/prefectures';
import { colors, fontFamily, fontSize } from '../theme';

interface PrefecturePickerProps {
  value?: string;
  onChange: (prefecture: string | undefined) => void;
  pickerStyle?: any;
}

export function PrefecturePicker({ value, onChange, pickerStyle }: PrefecturePickerProps) {
  return (
    <View style={pickerStyle}>
      <Picker
        selectedValue={value || ''}
        onValueChange={(itemValue) => {
          // Empty string means "not selected"
          onChange(itemValue === '' ? undefined : itemValue);
        }}
        style={[styles.picker, styles.pickerText]}
        itemStyle={styles.pickerItem}
        dropdownIconColor={colors.text.secondary}
      >
        <Picker.Item label="選択してください" value="" />
        {PREFECTURES.map((prefecture) => (
          <Picker.Item key={prefecture} label={prefecture} value={prefecture} />
        ))}
      </Picker>
    </View>
  );
}

const styles = StyleSheet.create({
  picker: {
    height: Platform.select({ ios: 180, android: 56 }),
  },
  pickerText: {
    color: colors.text.primary,
    backgroundColor: 'transparent',
  },
  pickerItem: {
    color: colors.text.primary,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
  },
});
