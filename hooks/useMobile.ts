import { useWindowDimensions } from 'react-native';

// Simple hook to determine if the device is a mobile phone or tablet
export function useMobile() {
  const { width } = useWindowDimensions();
  
  // Generally, devices with width less than 768px are considered mobile
  const isMobile = width < 768;
  
  return { isMobile };
}