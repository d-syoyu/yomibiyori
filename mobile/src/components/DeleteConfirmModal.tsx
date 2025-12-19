/**
 * Delete Confirm Modal Component
 * Displays a confirmation dialog before deleting a work
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ============================================================================
// Types
// ============================================================================

interface DeleteConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
  title?: string;
  message?: string;
}

// ============================================================================
// Delete Confirm Modal Component
// ============================================================================

export default function DeleteConfirmModal({
  visible,
  onClose,
  onConfirm,
  isDeleting,
  title = '作品を削除',
  message = 'この作品を削除してもよろしいですか？\nこの操作は取り消せません。',
}: DeleteConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="trash-outline" size={40} color="#E53E3E" />
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isDeleting}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
              onPress={onConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.deleteButtonText}>削除</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FED7D7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: 'NotoSerifJP_600SemiBold',
    color: '#2D3748',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    fontFamily: 'NotoSerifJP_400Regular',
    color: '#718096',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#EDF2F7',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'NotoSerifJP_500Medium',
    color: '#4A5568',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#E53E3E',
    alignItems: 'center',
  },
  deleteButtonDisabled: {
    backgroundColor: '#FC8181',
  },
  deleteButtonText: {
    fontSize: 16,
    fontFamily: 'NotoSerifJP_500Medium',
    color: '#FFFFFF',
  },
});
