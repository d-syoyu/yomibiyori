/**
 * Prefecture Picker Component
 * 都道府県選択コンポーネント
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { PREFECTURES } from '../constants/prefectures';

interface PrefecturePickerProps {
  value?: string;
  onChange: (prefecture: string | undefined) => void;
  label?: string;
}

export function PrefecturePicker({ value, onChange, label = '都道府県' }: PrefecturePickerProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={value || ''}
          onValueChange={(itemValue) => {
            // Empty string means "not selected"
            onChange(itemValue === '' ? undefined : itemValue);
          }}
          style={styles.picker}
          itemStyle={styles.pickerItem}
        >
          <Picker.Item label="選択してください" value="" />
          {PREFECTURES.map((prefecture) => (
            <Picker.Item key={prefecture} label={prefecture} value={prefecture} />
          ))}
        </Picker>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
    ...Platform.select({
      android: {
        // Android needs explicit height
        height: 50,
      },
    }),
  },
  picker: {
    ...Platform.select({
      ios: {
        height: 180,
      },
      android: {
        height: 50,
      },
    }),
  },
  pickerItem: {
    fontSize: 16,
    ...Platform.select({
      ios: {
        height: 180,
      },
    }),
  },
});
