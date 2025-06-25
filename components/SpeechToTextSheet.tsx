import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import SpeechToTextMic from './SpeechToTextMic';
import { useCreateTransactionFromSpeech } from '../hooks/useCreateTransactionFromSpeech';
import { useTheme } from '../contexts/ThemeContext';

interface SpeechToTextSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function SpeechToTextSheet({ isVisible, onClose }: SpeechToTextSheetProps) {
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const createTransactionFromSpeech = useCreateTransactionFromSpeech();
  const { theme, isDarkMode } = useTheme();

  const handleContinue = async () => {
    if (!transcript.trim()) return;
    setError('');
    try {
      await createTransactionFromSpeech.mutateAsync(transcript);
      setTranscript('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to process transaction.');
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.sheetContainer, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Frugify Command</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.content}>
            <SpeechToTextMic onTranscription={setTranscript} />
            <Text style={[styles.transcriptLabel, { color: theme.colors.text }]}>Command:</Text>
            <View style={[styles.transcriptBox, { backgroundColor: isDarkMode ? '#23272e' : '#f5f5f5' }]}>
              <TextInput
                style={[styles.transcriptText, { color: theme.colors.text }]}
                value={transcript}
                onChangeText={setTranscript}
                placeholder="Eg: I went to McDonald's to eat Mc Veggie Burger worth ₹250..."
                placeholderTextColor={theme.colors.placeholder}
                multiline
                editable
              />
            </View>
            {error ? <Text style={{ color: theme.colors.error || 'red', marginTop: 8 }}>{error}</Text> : null}
          </View>
          <TouchableOpacity style={[styles.continueButton, { backgroundColor: theme.colors.primary }]} onPress={handleContinue} disabled={createTransactionFromSpeech.isPending}>
            {createTransactionFromSpeech.isPending ? (
              <ActivityIndicator color={theme.colors.onPrimary || '#fff'} />
            ) : (
              <MaterialIcons name="arrow-forward" size={28} color={theme.colors.onPrimary || '#fff'} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetContainer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    minHeight: 220,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    alignItems: 'center',
  },
  transcriptLabel: {
    marginTop: 20,
    fontWeight: '500',
    color: '#333',
    alignSelf: 'flex-start',
  },
  transcriptBox: {
    minHeight: 60,
    width: '100%',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  transcriptText: {
    fontSize: 16,
  },
  transcriptPlaceholder: {
    color: '#aaa',
    fontStyle: 'italic',
  },
  continueButton: {
    marginTop: 24,
    alignSelf: 'flex-end',
    borderRadius: 24,
    padding: 12,
    elevation: 2,
  },
});
