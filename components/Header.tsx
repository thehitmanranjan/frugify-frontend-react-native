import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Animated, Easing, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { StackNavigationProp } from '@react-navigation/stack';
import InsightsSheet from './InsightsSheet';
import AISparkleIcon from './AISparkleIcon';
import { useTheme } from '../contexts/ThemeContext'; // Import useTheme
import { useSync } from '../contexts/SyncContext';
import { useDate } from '../contexts/DateContext';
import { useSearch } from '../contexts/SearchContext';
import { apiRequest } from '../lib/apiClient';
import { formatCurrency, formatTransactionAmount } from '../lib/formatters';
import { formatTransactionDate } from '../lib/date-utils';

type RootStackParamList = {
  Home: undefined;
  Budget: undefined;
  Settings: undefined;
  Categories: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface HeaderProps {
  showBackButton?: boolean;
  title?: string;
  onBackPress?: () => void;
}

interface SearchResult {
  id: number;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  category_id: number;
}

interface ApiSearchResponse {
  results: {
    id: string;
    content: {
      id: number;
      amount: number;
      description: string;
      date: string;
      categoryId: number;
      categoryName: string;
      userId: number;
    };
    metadata: {
      summary: string;
      searchableText: string;
    };
    score: number;
  }[];
  total: number;
  count: number;
  query: string;
}

export default function Header({ showBackButton = false, title, onBackPress }: HeaderProps = {}) {
  const navigation = useNavigation<NavigationProp>();
  const { logout } = useAuth();
  const { theme } = useTheme(); // Use theme from context
  const { syncing, triggerSync } = useSync();
  const { setCurrentDate, setTimeRange } = useDate();
  const { setSearchTarget } = useSearch();
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Search states
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [showingLimitedResults, setShowingLimitedResults] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  const MAX_DISPLAYED_RESULTS = 50; // Limit displayed results for performance

  useEffect(() => {
    if (syncing) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 700,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotateAnim.stopAnimation();
      rotateAnim.setValue(0);
    }
  }, [syncing, rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [insightsVisible, setInsightsVisible] = useState(false);

  // Search API call
  const searchTransactions = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setTotalResults(0);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await apiRequest<ApiSearchResponse>(
        'GET',
        `/api/search/transactions?query=${encodeURIComponent(query)}`
      );
      
      // Transform API response to SearchResult format
      const transformedResults: SearchResult[] = response.results
        .filter(result => result.score >= 0.5) // Filter out results with score less than 0.5
        .slice(0, MAX_DISPLAYED_RESULTS) // Limit results for performance
        .map(result => {
          // Determine transaction type based on category name or amount
          // Common income categories: salary, income, bonus, interest, etc.
          const incomeKeywords = ['salary', 'income', 'bonus', 'interest', 'dividend', 'refund', 'cashback'];
          const isIncome = incomeKeywords.some(keyword => 
            result.content.categoryName.toLowerCase().includes(keyword)
          );
          
          return {
            id: result.content.id,
            description: result.content.description,
            amount: result.content.amount,
            type: isIncome ? 'income' : 'expense',
            category: result.content.categoryName,
            date: result.content.date,
            category_id: result.content.categoryId,
          };
        });
      
      setSearchResults(transformedResults);
      setTotalResults(response.total);
      setShowingLimitedResults(response.total > MAX_DISPLAYED_RESULTS);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setTotalResults(0);
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchVisible) {
        searchTransactions(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchVisible]);

  // Handle search icon click
  const handleSearchPress = () => {
    setSearchVisible(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  // Handle search close
  const handleSearchClose = () => {
    setSearchVisible(false);
    setSearchQuery('');
    setSearchResults([]);
    setTotalResults(0);
    setShowingLimitedResults(false);
  };

  // Handle search result click
  const handleSearchResultPress = (result: SearchResult) => {
    // Navigate to the specific date
    const resultDate = new Date(result.date);
    setCurrentDate(resultDate);
    setTimeRange('day');
    
    // Set search target for the home screen to expand the category
    setSearchTarget({
      categoryId: result.category_id,
      transactionId: result.id,
    });
    
    // Close search
    handleSearchClose();
    
    // Navigate to home if not already there
    navigation.navigate('Home');
  };

  // Render search result item
  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={[styles.searchResultItem, { borderBottomColor: theme.colors.placeholder }]}
      onPress={() => handleSearchResultPress(item)}
    >
      <View style={styles.searchResultContent}>
        <View style={styles.searchResultLeft}>
          <Text style={[styles.searchResultDescription, { color: theme.colors.text }]} numberOfLines={1}>
            {item.description}
          </Text>
          <Text style={[styles.searchResultCategory, { color: theme.colors.placeholder }]}>
            {item.category} • {formatTransactionDate(item.date)}
          </Text>
        </View>
        <Text style={[
          styles.searchResultAmount,
          { color: item.type === 'income' ? '#4CAF50' : '#F44336' }
        ]}>
          {formatTransactionAmount(item.amount, item.type)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      navigation.goBack();
    }
  };

  return (
    <>
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.leftContainer}>
          {showBackButton ? (
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={handleBackPress}
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => setDrawerVisible(true)}
            >
              <MaterialCommunityIcons name="menu" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          )}
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {title || 'Frugify'}
          </Text>
        </View>
        <View style={styles.rightContainer}>
          {!showBackButton && (
            <>
              <TouchableOpacity style={styles.iconButton} onPress={handleSearchPress}>
                <MaterialCommunityIcons name="magnify" size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={triggerSync}>
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <MaterialCommunityIcons
                    name="refresh"
                    size={24}
                    color={theme.colors.text}
                  />
                </Animated.View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => setInsightsVisible(true)}
              >
                <AISparkleIcon size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => navigation.navigate('Settings')}
              >
                <MaterialCommunityIcons name="cog" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Search Bar */}
      {searchVisible && (
        <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.searchInputContainer, { backgroundColor: theme.colors.background, borderColor: theme.colors.placeholder }]}>
            <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.placeholder} style={styles.searchIcon} />
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Search transactions..."
              placeholderTextColor={theme.colors.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <TouchableOpacity onPress={handleSearchClose} style={styles.searchCloseButton}>
              <MaterialCommunityIcons name="close" size={20} color={theme.colors.placeholder} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Search Results */}
      {searchVisible && (
        <View style={[styles.searchResultsContainer, { backgroundColor: theme.colors.surface }]}>
          {searchLoading ? (
            <View style={styles.searchLoadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.searchLoadingText, { color: theme.colors.text }]}>Searching...</Text>
            </View>
          ) : searchResults.length > 0 ? (
            <>
              {totalResults > 0 && (
                <View style={styles.searchResultsHeader}>
                  <Text style={[styles.searchResultsCount, { color: theme.colors.placeholder }]}>
                    {showingLimitedResults 
                      ? `Showing ${searchResults.length} of ${totalResults} results`
                      : `${totalResults} result${totalResults !== 1 ? 's' : ''} found`
                    }
                  </Text>
                  {showingLimitedResults && (
                    <Text style={[styles.searchResultsNote, { color: theme.colors.placeholder }]}>
                      Refine your search to see more specific results
                    </Text>
                  )}
                </View>
              )}
              <FlatList
                data={searchResults}
                renderItem={renderSearchResult}
                keyExtractor={(item) => item.id.toString()}
                style={styles.searchResultsList}
                showsVerticalScrollIndicator={true}
                scrollIndicatorInsets={{ right: 1 }}
                keyboardShouldPersistTaps="handled"
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                windowSize={10}
                getItemLayout={(data, index) => ({
                  length: 60, // Approximate height of each item
                  offset: 60 * index,
                  index,
                })}
                ListFooterComponent={
                  showingLimitedResults ? (
                    <View style={styles.searchResultsFooter}>
                      <Text style={[styles.searchResultsFooterText, { color: theme.colors.placeholder }]}>
                        ••• More results available •••
                      </Text>
                    </View>
                  ) : null
                }
              />
            </>
          ) : searchQuery.length > 0 ? (
            <View style={styles.searchNoResults}>
              <Text style={[styles.searchNoResultsText, { color: theme.colors.placeholder }]}>
                No transactions found for "{searchQuery}"
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Search Overlay - to close search when clicking outside */}
      {searchVisible && (
        <TouchableOpacity
          style={styles.searchOverlay}
          onPress={handleSearchClose}
          activeOpacity={1}
        />
      )}

      <InsightsSheet isVisible={insightsVisible} onClose={() => setInsightsVisible(false)} />
      {/* Side Drawer */}
      {drawerVisible && (
        <View style={styles.drawerOverlay}>
          <View style={[styles.drawer, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.drawerHeader}>
              <Text style={[styles.drawerTitle, { color: theme.colors.text }]}>Frugify</Text>
              <TouchableOpacity 
                onPress={() => setDrawerVisible(false)}
                style={styles.closeButton}
              >
                <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView>
              <TouchableOpacity 
                style={styles.drawerItem}
                onPress={() => {
                  navigation.navigate('Home');
                  setDrawerVisible(false);
                }}
              >
                <MaterialCommunityIcons name="view-dashboard" size={22} color={theme.colors.text} style={styles.drawerIcon} />
                <Text style={[styles.drawerItemText, { color: theme.colors.text }]}>Dashboard</Text>
              </TouchableOpacity>
              
              {/*
              <TouchableOpacity 
                style={styles.drawerItem}
                onPress={() => {
                  navigation.navigate('Budget');
                  setDrawerVisible(false);
                }}
              >
                <MaterialCommunityIcons name="wallet" size={22} color={theme.colors.text} style={styles.drawerIcon} />
                <Text style={[styles.drawerItemText, { color: theme.colors.text }]}>Budget</Text>
              </TouchableOpacity>
              */}
              
              <TouchableOpacity 
                style={styles.drawerItem}
                onPress={() => {
                  navigation.navigate('Settings');
                  setDrawerVisible(false);
                }}
              >
                <MaterialCommunityIcons name="cog" size={22} color={theme.colors.text} style={styles.drawerIcon} />
                <Text style={[styles.drawerItemText, { color: theme.colors.text }]}>Settings</Text>
              </TouchableOpacity>

              {/* Logout Button */}
              <TouchableOpacity 
                style={styles.drawerItem}
                onPress={async () => {
                  await logout(); 
                  setDrawerVisible(false);
                }}
              >
                <MaterialCommunityIcons name="logout" size={22} color={theme.colors.text} style={styles.drawerIcon} />
                <Text style={[styles.drawerItemText, { color: theme.colors.text }]}>Logout</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
          
          <TouchableOpacity
            style={styles.drawerOutside}
            onPress={() => setDrawerVisible(false)}
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    // backgroundColor: 'white', // Theme controlled
    shadowColor: '#000', // Keep or make theme-dependent
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, // Keep or make theme-dependent
    shadowRadius: 1,
    elevation: 2,
    zIndex: 10,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: { // Text color is theme controlled
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  iconButton: { // Icon color is theme controlled
    padding: 8,
  },
  // Search styles
  searchContainer: {
    padding: 16,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
    zIndex: 9,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  searchCloseButton: {
    padding: 4,
    marginLeft: 8,
  },
  searchResultsContainer: {
    maxHeight: 350, // Increased height to show more results
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  searchResultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  searchResultsCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  searchResultsNote: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  searchResultsList: {
    maxHeight: 280, // Adjusted to account for header
    flexGrow: 1,
  },
  searchResultsFooter: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E0',
  },
  searchResultsFooterText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  searchResultItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchResultContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchResultLeft: {
    flex: 1,
    marginRight: 12,
  },
  searchResultDescription: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  searchResultCategory: {
    fontSize: 12,
  },
  searchResultAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  searchLoadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  searchNoResults: {
    padding: 20,
    alignItems: 'center',
  },
  searchNoResultsText: {
    fontSize: 14,
    textAlign: 'center',
  },
  searchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 7,
  },
  drawerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    zIndex: 1000,
  },
  drawer: { // Background color is theme controlled
    width: 250,
    // backgroundColor: 'white', // Theme controlled
    height: '100%',
    shadowColor: '#000', // Keep or make theme-dependent
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2, // Keep or make theme-dependent
    shadowRadius: 5,
    elevation: 5,
    padding: 16,
    zIndex: 1001,
  },
  drawerOutside: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)', // Consider making this theme-dependent if needed
  },
  drawerHeader: { // Text color is theme controlled
    marginTop: 30,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  drawerTitle: { // Text color is theme controlled
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: { // Icon color is theme controlled
    padding: 8,
  },
  drawerItem: { // Icon and text color are theme controlled
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15, 
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 8, 
  },
  drawerIcon: { // Icon color is theme controlled
    marginRight: 15,
  },
  drawerItemText: { // Text color is theme controlled
    fontSize: 16,
    fontWeight: '500',
  },
});