/**
 * Edit Work Modal Component
 * Allows users to edit their work text (line by line like CompositionScreen)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Work } from '../types';
import { colors, spacing, borderRadius, fontSize, fontFamily } from '../theme';

// ============================================================================
// Types
// ============================================================================

interface EditWorkModalProps {
  visible: boolean;
  work: Work | null;
  onClose: () => void;
  onSave: (text: string) => Promise<void>;
  isSaving: boolean;
}

const MAX_LINE_LENGTH = 20;

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Parse work text into two lines
 * work.text format: "${line1} \n${line2} "
 */
function parseWorkText(text: string): { line1: string; line2: string } {
  const lines = text.split('\n');
  return {
    line1: lines[0]?.trim() || '',
    line2: lines[1]?.trim() || '',
  };
}

/**
 * Combine two lines into work text format
 */
function combineLines(line1: string, line2: string): string {
  return `${line1.trim()} \n${line2.trim()} `;
}

// ============================================================================
// Edit Work Modal Component
// ============================================================================

export default function EditWorkModal({
  visible,
  work,
  onClose,
  onSave,
  isSaving,
}: EditWorkModalProps) {
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');

  // Initialize lines when work changes
  useEffect(() => {
    if (work) {
      const { line1: l1, line2: l2 } = parseWorkText(work.text);
      setLine1(l1);
      setLine2(l2);
    }
  }, [work]);

  const handleSave = async () => {
    if (line1.trim() && line2.trim()) {
      const combinedText = combineLines(line1, line2);
      await onSave(combinedText);
    }
  };

  const handleClose = () => {
    setLine1('');
    setLine2('');
    onClose();
  };

  const isValid = line1.trim().length > 0 && line2.trim().length > 0;
  const originalParsed = work ? parseWorkText(work.text) : { line1: '', line2: '' };
  const isChanged = line1.trim() !== originalParsed.line1 || line2.trim() !== originalParsed.line2;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              disabled={isSaving}
            >
              <Ionicons name="close" size={24} color="#718096" />
            </TouchableOpacity>
            <Text style={styles.title}>作品を編集</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.inputSection}>
              <Text style={styles.label}>下の句（第一句：7音）</Text>
              <TextInput
                style={styles.textInput}
                value={line1}
                onChangeText={setLine1}
                placeholder="第一句を入力"
                placeholderTextColor="#A0AEC0"
                maxLength={MAX_LINE_LENGTH}
                multiline
                autoFocus
                editable={!isSaving}
              />
              <Text style={[styles.charCount, line1.length > MAX_LINE_LENGTH && styles.charCountError]}>
                {line1.length} / {MAX_LINE_LENGTH}
              </Text>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.label}>下の句（第二句：7音）</Text>
              <TextInput
                style={styles.textInput}
                value={line2}
                onChangeText={setLine2}
                placeholder="第二句を入力"
                placeholderTextColor="#A0AEC0"
                maxLength={MAX_LINE_LENGTH}
                multiline
                editable={!isSaving}
              />
              <Text style={[styles.charCount, line2.length > MAX_LINE_LENGTH && styles.charCountError]}>
                {line2.length} / {MAX_LINE_LENGTH}
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={isSaving}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (!isValid || !isChanged || isSaving) && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!isValid || !isChanged || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>保存</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
  },
  closeButton: {
    padding: spacing.sm,
  },
  title: {
    fontSize: fontSize.h2,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: spacing.lg,
  },
  inputSection: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.body,
    fontFamily: fontFamily.regular,
    color: colors.text.primary,
    minHeight: 60,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.background.secondary,
  },
  charCount: {
    fontSize: fontSize.caption,
    fontFamily: fontFamily.regular,
    color: colors.text.tertiary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  charCountError: {
    color: colors.status.error,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  cancelButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.secondary,
  },
  cancelButtonText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.medium,
    color: colors.text.secondary,
  },
  saveButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.text.primary,
    minWidth: 80,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: colors.background.secondary,
  },
  saveButtonText: {
    fontSize: fontSize.body,
    fontFamily: fontFamily.medium,
    color: colors.text.inverse,
  },
});
