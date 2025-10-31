/**
 * Prefecture Picker Component
 * 都道府県選択コンポーネント
 */

import React from 'react';
import { View, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { PREFECTURES } from '../constants/prefectures';

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
        style={{
          ...Platform.select({
            ios: {
              height: 180,
            },
            android: {
              height: 50,
            },
          }),
        }}
      >
        <Picker.Item label="選択してください" value="" />
        {PREFECTURES.map((prefecture) => (
          <Picker.Item key={prefecture} label={prefecture} value={prefecture} />
        ))}
      </Picker>
    </View>
  );
}
