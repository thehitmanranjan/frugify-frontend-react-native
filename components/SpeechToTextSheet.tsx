import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import SpeechToTextMic from './SpeechToTextMic';
import { useCreateTransactionFromSpeech } from '../hooks/useCreateTransactionFromSpeech';

interface SpeechToTextSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function SpeechToTextSheet({ isVisible, onClose }: SpeechToTextSheetProps) {
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const createTransactionFromSpeech = useCreateTransactionFromSpeech();

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
        <View style={styles.sheetContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Frugify Command</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <View style={styles.content}>
            <SpeechToTextMic onTranscription={setTranscript} />
            <Text style={styles.transcriptLabel}>Command:</Text>
            <View style={styles.transcriptBox}>
              <TextInput
                style={styles.transcriptText}
                value={transcript}
                onChangeText={setTranscript}
                placeholder="Eg: I went to McDonald's to eat Mc Veggie Burger worth ₹250..."
                multiline
                editable
              />
            </View>
            {error ? <Text style={{ color: 'red', marginTop: 8 }}>{error}</Text> : null}
          </View>
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue} disabled={createTransactionFromSpeech.isPending}>
            {createTransactionFromSpeech.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <MaterialIcons name="arrow-forward" size={28} color="#fff" />
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
    backgroundColor: 'white',
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
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  transcriptText: {
    color: '#333',
    fontSize: 16,
  },
  transcriptPlaceholder: {
    color: '#aaa',
    fontStyle: 'italic',
  },
  continueButton: {
    marginTop: 24,
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    borderRadius: 24,
    padding: 12,
    elevation: 2,
  },
});
