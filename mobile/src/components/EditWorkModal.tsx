/**
 * Edit Work Modal Component
 * Allows users to edit their work text
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

const MAX_TEXT_LENGTH = 40;

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
  const [text, setText] = useState('');

  // Initialize text when work changes
  useEffect(() => {
    if (work) {
      setText(work.text);
    }
  }, [work]);

  const handleSave = async () => {
    const trimmedText = text.trim();
    if (trimmedText && trimmedText.length <= MAX_TEXT_LENGTH) {
      await onSave(trimmedText);
    }
  };

  const handleClose = () => {
    setText('');
    onClose();
  };

  const isValid = text.trim().length > 0 && text.trim().length <= MAX_TEXT_LENGTH;
  const isChanged = work && text.trim() !== work.text;

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
            <Text style={styles.label}>下の句</Text>
            <TextInput
              style={styles.textInput}
              value={text}
              onChangeText={setText}
              placeholder="下の句を入力..."
              placeholderTextColor="#A0AEC0"
              maxLength={MAX_TEXT_LENGTH}
              multiline
              autoFocus
              editable={!isSaving}
            />
            <Text style={[styles.charCount, text.length > MAX_TEXT_LENGTH && styles.charCountError]}>
              {text.length} / {MAX_TEXT_LENGTH}
            </Text>
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
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'NotoSerifJP_600SemiBold',
    color: '#2D3748',
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'NotoSerifJP_500Medium',
    color: '#4A5568',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontFamily: 'NotoSerifJP_400Regular',
    color: '#2D3748',
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'NotoSerifJP_400Regular',
    color: '#718096',
    textAlign: 'right',
    marginTop: 8,
  },
  charCountError: {
    color: '#E53E3E',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#EDF2F7',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'NotoSerifJP_500Medium',
    color: '#4A5568',
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#4A5568',
    minWidth: 80,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#CBD5E0',
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'NotoSerifJP_500Medium',
    color: '#FFFFFF',
  },
});
