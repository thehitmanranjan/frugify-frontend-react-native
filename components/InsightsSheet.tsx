import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import SpeechToTextMic from './SpeechToTextMic';
import { useInsightsQuery } from '../hooks/useInsightsQuery';
import { useTheme } from '../contexts/ThemeContext';

interface InsightsSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function InsightsSheet({ isVisible, onClose }: InsightsSheetProps) {
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');
  const insightsMutation = useInsightsQuery();
  const { theme, isDarkMode } = useTheme();

  const handleAsk = async () => {
    if (!transcript.trim()) return;
    setError('');
    setResponse('');
    insightsMutation.mutate(transcript, {
      onSuccess: (data: any) => {
        setResponse(data.answer || data.response || JSON.stringify(data));
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
        <View style={[styles.sheetContainer, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Frugify Insights</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.content}>
            <SpeechToTextMic onTranscription={setTranscript} />
            <Text style={[styles.transcriptLabel, { color: theme.colors.text }]}>Query:</Text>
            <View style={[styles.transcriptBox, { backgroundColor: isDarkMode ? '#23272e' : '#f5f5f5' }]}>
              <TextInput
                style={[styles.transcriptText, { color: theme.colors.text }]}
                value={transcript}
                onChangeText={setTranscript}
                placeholder="Say something to get insights..."
                placeholderTextColor={theme.colors.placeholder}
                multiline
                editable
              />
            </View>
            <TouchableOpacity style={[styles.continueButton, { backgroundColor: theme.colors.primary }]} onPress={handleAsk} disabled={insightsMutation.isPending}>
              {insightsMutation.isPending ? (
                <ActivityIndicator color={theme.colors.onPrimary || '#fff'} />
              ) : (
                <MaterialIcons name="arrow-forward" size={28} color={theme.colors.onPrimary || '#fff'} />
              )}
            </TouchableOpacity>
            <Text style={[styles.transcriptLabel, { color: theme.colors.text }]}>Response:</Text>
            <ScrollView style={[styles.responseBox, { backgroundColor: isDarkMode ? '#23272e' : '#f5f5f5' }]}>
              <Text style={[styles.responseText, { color: theme.colors.text }]}>{response}</Text>
            </ScrollView>
            {error ? <Text style={{ color: theme.colors.error || 'red', marginTop: 8 }}>{error}</Text> : null}
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
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    // backgroundColor will be set inline
  },
  transcriptText: {
    fontSize: 16,
    // color will be set inline
  },
  continueButton: {
    marginTop: 16,
    alignSelf: 'flex-end',
    borderRadius: 24,
    padding: 12,
    elevation: 2,
  },
  responseBox: {
    minHeight: 60,
    maxHeight: 120,
    width: '100%',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    // backgroundColor will be set inline
  },
  responseText: {
    fontSize: 16,
    // color will be set inline
  },
});
