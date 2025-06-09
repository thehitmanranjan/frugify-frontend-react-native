import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';

const DEEPGRAM_API_KEY = '47246cbc117731cfd2833b78c6c70c62527597a7'; // Replace with your Deepgram API Key

interface SpeechToTextMicProps {
  onTranscription?: (transcript: string) => void;
}

export default function SpeechToTextMic({ onTranscription }: SpeechToTextMicProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const recordingRef = useRef<Audio.Recording | null>(null);

  const startRecording = async () => {
    try {
      setError('');
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      recordingRef.current = recording;
    } catch (err) {
      setError('Could not start recording.');
    }
  };

  const stopRecording = async () => {
    setIsLoading(true);
    try {
      const rec = recordingRef.current;
      if (!rec) return;
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      setRecording(null);
      recordingRef.current = null;
      await sendToDeepgram(uri!);
    } catch (err) {
      setError('Could not stop recording.');
    }
    setIsLoading(false);
  };

  const sendToDeepgram = async (uri: string) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      // Use Deepgram's 'nova' model (latest) with 'en-IN' (English, Indian accent)
      const deepgramRes = await fetch('https://api.deepgram.com/v1/listen?language=en-IN&model=nova', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': 'audio/wav',
        },
        body: blob,
      });
      const result = await deepgramRes.json();
      const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
      if (onTranscription) onTranscription(transcript);
    } catch (err) {
      setError('Transcription failed.');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={recording ? stopRecording : startRecording}
        style={styles.micButton}
        disabled={isLoading}
      >
        <MaterialIcons name={recording ? 'stop' : 'mic'} size={32} color="#fff" />
      </TouchableOpacity>
      {isLoading && <ActivityIndicator style={{ marginLeft: 10 }} />}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center' },
  micButton: {
    backgroundColor: '#007AFF',
    borderRadius: 24,
    padding: 12,
  },
  error: { color: 'red', marginLeft: 10 },
});
