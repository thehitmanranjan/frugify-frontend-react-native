import { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';

// Use the custom scheme instead of createURL for standalone apps
const prefix = 'com.thehitmanranjan.frugify://';

const config = {
  screens: {
    Home: 'home',
    Budget: 'budget',
    Settings: 'settings',
    Categories: 'categories',
  },
};

export const linking: LinkingOptions<any> = {
  prefixes: [prefix],
  config,
  async getInitialURL() {
    // Get the initial URL from expo-linking
    try {
      const url = await Linking.getInitialURL();
      return url;
    } catch (error) {
      console.warn('Error getting initial URL:', error);
      return null;
    }
  },
  subscribe(listener) {
    const onReceiveURL = ({ url }: { url: string }) => {
      console.log('Received URL:', url);
      return listener(url);
    };

    try {
      // Listen for incoming links
      const subscription = Linking.addEventListener('url', onReceiveURL);

      return () => {
        subscription?.remove();
      };
    } catch (error) {
      console.warn('Error subscribing to URL events:', error);
      return () => {};
    }
  },
};
