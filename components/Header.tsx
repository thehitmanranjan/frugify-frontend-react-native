import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'; // Added ScrollView
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  Home: undefined;
  Budget: undefined;
  Settings: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function Header() {
  const navigation = useNavigation<NavigationProp>();
  const { logout } = useAuth(); // Get logout function
  const [drawerVisible, setDrawerVisible] = useState(false);

  return (
    <>
      <View style={styles.header}>
        <View style={styles.leftContainer}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => setDrawerVisible(true)}
          >
            <MaterialCommunityIcons name="menu" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Frugify</Text>
        </View>
        <View style={styles.rightContainer}>
          <TouchableOpacity style={styles.iconButton}>
            <MaterialCommunityIcons name="magnify" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <MaterialCommunityIcons name="cog" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Side Drawer */}
      {drawerVisible && (
        <View style={styles.drawerOverlay}>
          <View style={styles.drawer}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Frugify</Text>
              <TouchableOpacity 
                onPress={() => setDrawerVisible(false)}
                style={styles.closeButton}
              >
                <MaterialCommunityIcons name="close" size={24} color="#333" />
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
                <MaterialCommunityIcons name="view-dashboard" size={22} color="#555" style={styles.drawerIcon} />
                <Text style={styles.drawerItemText}>Dashboard</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.drawerItem}
                onPress={() => {
                  navigation.navigate('Budget');
                  setDrawerVisible(false);
                }}
              >
                <MaterialCommunityIcons name="wallet" size={22} color="#555" style={styles.drawerIcon} />
                <Text style={styles.drawerItemText}>Budget</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.drawerItem}
                onPress={() => {
                  navigation.navigate('Settings');
                  setDrawerVisible(false);
                }}
              >
                <MaterialCommunityIcons name="cog" size={22} color="#555" style={styles.drawerIcon} />
                <Text style={styles.drawerItemText}>Settings</Text>
              </TouchableOpacity>

              {/* Logout Button */}
              <TouchableOpacity 
                style={styles.drawerItem}
                onPress={async () => {
                  await logout(); 
                  setDrawerVisible(false);
                }}
              >
                <MaterialCommunityIcons name="logout" size={22} color="#555" style={styles.drawerIcon} />
                <Text style={styles.drawerItemText}>Logout</Text>
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
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
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
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  iconButton: {
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
  drawer: {
    width: 250,
    backgroundColor: 'white',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    padding: 16,
    zIndex: 1001,
  },
  drawerOutside: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  drawerHeader: {
    marginTop: 30,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  drawerItem: {
    flexDirection: 'row', // Align icon and text
    alignItems: 'center', // Center items vertically
    paddingVertical: 15, 
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 8, 
  },
  drawerIcon: {
    marginRight: 15, // Space between icon and text
  },
  drawerItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333', 
  },
});