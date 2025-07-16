import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, ScrollView, TextInput, KeyboardAvoidingView, Platform, FlatList, Animated } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useInsightsQuery } from '../hooks/useInsightsQuery';
import { useTheme } from '../contexts/ThemeContext';
import SpeechToTextMic from './SpeechToTextMic';
import AISparkleIcon from './AISparkleIcon';

interface InsightsSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'ai';
  text: string;
}

export default function InsightsSheet({ isVisible, onClose }: InsightsSheetProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState('');
  const [recording, setRecording] = useState(false);
  const [showMic, setShowMic] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const insightsMutation = useInsightsQuery();
  const { theme, isDarkMode } = useTheme();

  const handleSend = async () => {
    const transcript = input.trim();
    if (!transcript) return;
    setError('');
    setMessages(prev => [...prev, { role: 'user', text: transcript }]);
    setInput('');
    setIsTyping(true);
    insightsMutation.mutate(transcript, {
      onSuccess: (data: any) => {
        setMessages(prev => [
          ...prev,
          { role: 'ai', text: data.answer || data.response || JSON.stringify(data) },
        ]);
        setIsTyping(false);
      },
      onError: (err: any) => {
        setMessages(prev => [
          ...prev,
          { role: 'ai', text: err.message || 'Failed to fetch insights.' },
        ]);
        setIsTyping(false);
      },
    });
  };

  const handleMicTranscription = (text: string) => {
    setInput(text);
    setRecording(false);
    setShowMic(false);
  };

  const handleMicPress = () => {
    if (!recording) {
      setRecording(true);
      setShowMic(true);
    } else {
      setRecording(false);
      setShowMic(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageRow,
        item.role === 'user' ? { flexDirection: 'row-reverse' } : { flexDirection: 'row' },
      ]}
    >
      <View style={[styles.avatarCircle, { backgroundColor: item.role === 'user' ? theme.colors.primary : (isDarkMode ? '#2a2a2a' : '#f0f0f0') }]}>
        {item.role === 'user' ? (
          <Text style={styles.avatarText}>AK</Text>
        ) : (
          <AISparkleIcon size={20} color={theme.colors.primary} />
        )}
      </View>
      <View
        style={[
          styles.messageContainer,
          item.role === 'user'
            ? { alignSelf: 'flex-end' }
            : { alignSelf: 'flex-start' },
        ]}
      >
        <View
          style={[
            styles.bubble,
            item.role === 'user'
              ? { backgroundColor: theme.colors.primary, borderTopRightRadius: 0 }
              : { backgroundColor: isDarkMode ? '#23272e' : '#e0e0e0', borderTopLeftRadius: 0 },
          ]}
        >
          <Text
            style={[
              styles.bubbleText,
              item.role === 'user'
                ? { color: theme.colors.onPrimary || '#fff' }
                : { color: theme.colors.text },
            ]}
          >
            {item.text}
          </Text>
        </View>
      </View>
    </View>
  );

  // Typing animation dots
  const TypingAnimation = () => {
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;
    React.useEffect(() => {
      const animate = (dot: Animated.Value, delay: number) => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(dot, { toValue: 1, duration: 300, delay, useNativeDriver: true }),
            Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          ])
        ).start();
      };
      animate(dot1, 0);
      animate(dot2, 150);
      animate(dot3, 300);
    }, []);
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
        <Animated.Text style={{ opacity: dot1, fontSize: 22, color: theme.colors.text }}>.</Animated.Text>
        <Animated.Text style={{ opacity: dot2, fontSize: 22, color: theme.colors.text }}>.</Animated.Text>
        <Animated.Text style={{ opacity: dot3, fontSize: 22, color: theme.colors.text }}>.</Animated.Text>
      </View>
    );
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={[styles.sheetContainer, { backgroundColor: theme.colors.surface }]}>  
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.colors.text }]}>Frugify Insights</Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialIcons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.chatListWrapper}>
              <FlatList
                data={isTyping ? [...messages, { role: 'ai', text: '' }] : messages}
                renderItem={(props) =>
                  isTyping && props.index === messages.length
                    ? (
                      <View style={[styles.messageRow, { flexDirection: 'row' }]}> 
                        <View style={[styles.avatarCircle, { backgroundColor: isDarkMode ? '#2a2a2a' : '#f0f0f0' }]}><AISparkleIcon size={20} color={theme.colors.primary} /></View>
                        <View style={[styles.messageContainer, { alignSelf: 'flex-start' }]}> 
                          <View style={[styles.bubble, { backgroundColor: isDarkMode ? '#23272e' : '#e0e0e0', borderTopLeftRadius: 0 }]}> 
                            <TypingAnimation />
                          </View>
                        </View>
                      </View>
                    )
                    : renderMessage({ item: props.item as Message })
                }
                keyExtractor={(_, idx) => idx.toString()}
                contentContainerStyle={{ paddingBottom: 16, flexGrow: 1, justifyContent: 'flex-end' }}
                style={styles.chatList}
              />
            </View>
            {error ? <Text style={{ color: theme.colors.error || 'red', marginTop: 8 }}>{error}</Text> : null}
            <View style={styles.inputRow}>
              <SpeechToTextMic 
                onTranscription={handleMicTranscription}
                size={20}
                backgroundColor={theme.colors.primary}
              />
              <View style={[styles.inputBox, { backgroundColor: isDarkMode ? '#23272e' : '#f5f5f5' }]}>  
                <TextInput
                  style={[styles.inputText, { color: theme.colors.text }]}
                  value={input}
                  onChangeText={setInput}
                  placeholder="Type or speak your question..."
                  placeholderTextColor={theme.colors.placeholder}
                  multiline
                  editable={!insightsMutation.isPending}
                  onSubmitEditing={handleSend}
                  blurOnSubmit={false}
                />
              </View>
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleSend}
                disabled={insightsMutation.isPending || !input.trim()}
              >
                <MaterialIcons name="send" size={20} color={theme.colors.onPrimary || '#fff'} />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    minHeight: 400,
    padding: 20,
    maxHeight: '100%',
    flex: 1,
    justifyContent: 'flex-end',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  chatListWrapper: {
    flex: 1,
    minHeight: 0,
    marginBottom: 8,
  },
  chatList: {
    flex: 1,
    minHeight: 0,
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  bubble: {
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  bubbleText: {
    fontSize: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 8,
    marginBottom: Platform.OS === 'ios' ? 16 : 8,
  },
  iconButton: {
    borderRadius: 20,
    padding: 8,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
  },
  inputBox: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 8,
    minHeight: 40,
    maxHeight: 100,
    justifyContent: 'center',
  },
  inputText: {
    fontSize: 16,
    padding: 0,
  },
  sendButton: {
    borderRadius: 24,
    padding: 10,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 2,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  avatarText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});
