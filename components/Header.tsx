import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { StackNavigationProp } from '@react-navigation/stack';
import InsightsSheet from './InsightsSheet';
import { useTheme } from '../contexts/ThemeContext'; // Import useTheme

type RootStackParamList = {
  Home: undefined;
  Budget: undefined;
  Settings: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function Header() {
  const navigation = useNavigation<NavigationProp>();
  const { logout } = useAuth();
  const { theme } = useTheme(); // Use theme from context
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [insightsVisible, setInsightsVisible] = useState(false);

  return (
    <>
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.leftContainer}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => setDrawerVisible(true)}
          >
            <MaterialCommunityIcons name="menu" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>Frugify</Text>
        </View>
        <View style={styles.rightContainer}>
          <TouchableOpacity style={styles.iconButton}>
            <MaterialCommunityIcons name="magnify" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => setInsightsVisible(true)}
          >
            <MaterialCommunityIcons name="information-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <MaterialCommunityIcons name="cog" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>
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