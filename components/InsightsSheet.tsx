import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import SpeechToTextMic from './SpeechToTextMic';
import { useInsightsQuery } from '../hooks/useInsightsQuery';

interface InsightsSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function InsightsSheet({ isVisible, onClose }: InsightsSheetProps) {
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');
  const insightsMutation = useInsightsQuery();

  const handleAsk = async () => {
    if (!transcript.trim()) return;
    setError('');
    setResponse('');
    insightsMutation.mutate(transcript, {
      onSuccess: (data: any) => {
        setResponse(data.response || JSON.stringify(data));
      },
      onError: (err: any) => {
        setError(err.message || 'Failed to fetch insights.');
      },
    });
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
            <Text style={styles.title}>Frugify Insights</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <View style={styles.content}>
            <SpeechToTextMic onTranscription={setTranscript} />
            <Text style={styles.transcriptLabel}>Query:</Text>
            <View style={styles.transcriptBox}>
              <TextInput
                style={styles.transcriptText}
                value={transcript}
                onChangeText={setTranscript}
                placeholder="Say something to get insights..."
                multiline
                editable
              />
            </View>
            <TouchableOpacity style={styles.continueButton} onPress={handleAsk} disabled={insightsMutation.isPending}>
              {insightsMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <MaterialIcons name="arrow-forward" size={28} color="#fff" />
              )}
            </TouchableOpacity>
            <Text style={styles.transcriptLabel}>Response:</Text>
            <ScrollView style={styles.responseBox}>
              <Text style={styles.responseText}>{response}</Text>
            </ScrollView>
            {error ? <Text style={{ color: 'red', marginTop: 8 }}>{error}</Text> : null}
          </View>
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
    minHeight: 320,
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
    minHeight: 40,
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
  continueButton: {
    marginTop: 16,
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    borderRadius: 24,
    padding: 12,
    elevation: 2,
  },
  responseBox: {
    minHeight: 60,
    maxHeight: 120,
    width: '100%',
    backgroundColor: '#e8f0fe',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  responseText: {
    color: '#222',
    fontSize: 16,
  },
});
