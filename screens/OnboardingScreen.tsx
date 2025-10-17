import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Animated,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
}

interface OnboardingSlide {
  id: number;
  title: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  gradient?: string[];
}

const onboardingData: OnboardingSlide[] = [
  {
    id: 1,
    title: "Welcome to Frugify",
    description: "Your smart companion for effortless money management",
    icon: "wallet-outline",
  },
  {
    id: 2,
    title: "Track Every Penny",
    description: "Log expenses and income with just a few taps",
    icon: "cash-multiple",
  },
  {
    id: 3,
    title: "Smart Voice Input",
    description: "Add transactions naturally using voice commands",
    icon: "microphone-outline",
  },
  {
    id: 4,
    title: "Visual Insights",
    description: "Understand your spending patterns with beautiful charts",
    icon: "chart-line",
  },
  {
    id: 5,
    title: "Budget Like a Pro",
    description: "Set goals and stay on track with intelligent alerts",
    icon: "target",
  },
];

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { theme, isDarkMode } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;

  // Animate in the current slide
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentIndex]);

  // Reset animations when slide changes
  const resetAnimations = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    scaleAnim.setValue(0.8);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const index = Math.round(contentOffset.x / screenWidth);
    if (index !== currentIndex) {
      resetAnimations();
      setCurrentIndex(index);
    }
  };

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollViewRef.current?.scrollTo({
        x: nextIndex * screenWidth,
        animated: true,
      });
    }
  };

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(buttonScaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleSkip = async () => {
    animateButton();
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    onComplete();
  };

  const handleGetStarted = async () => {
    animateButton();
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    onComplete();
  };

  const renderDots = () => {
    return (
      <View style={styles.dotsContainer}>
        {onboardingData.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: index === currentIndex 
                  ? theme.colors.primary 
                  : theme.colors.placeholder,
                width: index === currentIndex ? 24 : 8,
              }
            ]}
          />
        ))}
      </View>
    );
  };

  const renderSlide = (slide: OnboardingSlide, index: number) => {
    const isLast = index === onboardingData.length - 1;
    const isActive = index === currentIndex;
    
    return (
      <View 
        key={slide.id} 
        style={[
          styles.slide, 
          { backgroundColor: theme.colors.background }
        ]}
      >
        <Animated.View 
          style={[
            styles.slideContent,
            {
              opacity: isActive ? fadeAnim : 0.3,
              transform: [
                { translateY: isActive ? slideAnim : 50 },
                { scale: isActive ? scaleAnim : 0.8 }
              ],
            }
          ]}
        >
          {/* Icon Container */}
          <Animated.View 
            style={[
              styles.iconContainer,
              { 
                backgroundColor: `${theme.colors.primary}${isDarkMode ? '20' : '15'}`,
                borderColor: `${theme.colors.primary}${isDarkMode ? '30' : '25'}`,
                transform: [{ scale: isActive ? scaleAnim : 0.8 }]
              }
            ]}
          >
            <MaterialCommunityIcons
              name={slide.icon}
              size={80}
              color={theme.colors.primary}
            />
          </Animated.View>

          {/* Text Content */}
          <Animated.View 
            style={[
              styles.textContainer,
              {
                transform: [{ translateY: isActive ? slideAnim : 30 }],
                opacity: isActive ? fadeAnim : 0.5,
              }
            ]}
          >
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {slide.title}
            </Text>
            <Text style={[styles.description, { color: theme.colors.placeholder }]}>
              {slide.description}
            </Text>
          </Animated.View>

          {/* Action Buttons */}
          <Animated.View 
            style={[
              styles.buttonsContainer,
              {
                transform: [{ scale: isActive ? buttonScaleAnim : 0.9 }],
                opacity: isActive ? fadeAnim : 0.5,
              }
            ]}
          >
            {isLast ? (
              <TouchableOpacity
                style={[
                  styles.getStartedButton,
                  { 
                    backgroundColor: theme.colors.primary,
                    shadowColor: theme.colors.primary,
                  }
                ]}
                onPress={handleGetStarted}
                activeOpacity={0.8}
              >
                <Text style={styles.getStartedText}>Get Started</Text>
                <MaterialCommunityIcons 
                  name="arrow-right" 
                  size={20} 
                  color="white" 
                  style={{ marginLeft: 8 }}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.nextButton,
                  { 
                    backgroundColor: theme.colors.primary,
                    shadowColor: theme.colors.primary,
                  }
                ]}
                onPress={handleNext}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="arrow-right" size={24} color="white" />
              </TouchableOpacity>
            )}
          </Animated.View>
        </Animated.View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Skip Button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={[styles.skipText, { color: theme.colors.placeholder }]}>
            Skip
          </Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {onboardingData.map((slide, index) => renderSlide(slide, index))}
      </ScrollView>

      {/* Dots Indicator */}
      {renderDots()}

      {/* Progress Text */}
      <View style={styles.progressContainer}>
        <Text style={[styles.progressText, { color: theme.colors.placeholder }]}>
          {currentIndex + 1} of {onboardingData.length}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width: screenWidth,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    borderWidth: 2,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
  },
  description: {
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
    fontWeight: '400',
  },
  buttonsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  nextButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  getStartedText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingBottom: 30,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  progressContainer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
