import { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';

const prefix = Linking.createURL('/');

const config = {
  screens: {
    Home: 'home',
    Budget: 'budget',
    Settings: 'settings',
    Categories: 'categories',
  },
};

export const linking: LinkingOptions<any> = {
  prefixes: [prefix, 'com.thehitmanranjan.frugify://'],
  config,
  async getInitialURL() {
    // Get the initial URL from expo-linking
    const url = await Linking.getInitialURL();
    return url;
  },
  subscribe(listener) {
    const onReceiveURL = ({ url }: { url: string }) => {
      console.log('Received URL:', url);
      return listener(url);
    };

    // Listen for incoming links
    const subscription = Linking.addEventListener('url', onReceiveURL);

    return () => {
      subscription?.remove();
    };
  },
};
