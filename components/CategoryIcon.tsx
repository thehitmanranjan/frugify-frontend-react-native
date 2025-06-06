import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface CategoryIconProps {
  name: string;
  color: string;
  size?: number;
  style?: any;
}

// Map of category names to icon names in MaterialCommunityIcons
const iconMap: { [key: string]: string } = {
  activity: 'heart-pulse',
  banknote: 'cash',
  book: 'book-open-variant',
  briefcase: 'briefcase',
  'credit-card': 'credit-card',
  film: 'movie',
  gift: 'gift',
  home: 'home',
  map: 'map-marker',
  'plus-circle': 'plus-circle',
  'shopping-bag': 'shopping',
  'trending-up': 'trending-up',
  utensils: 'silverware-fork-knife',
  shower: 'shower', 
  car: 'car', 
  'tshirt-crew': 'tshirt-crew', 
  cellphone: 'cellphone', 
  'hand-heart': 'hand-heart',
  'silverware-fork-knife': 'silverware-fork-knife',
  food: 'food',
  'account-group': 'account-group',
  'gas-station': 'gas-station',
  laptop: 'laptop', 
  'heart-pulse': 'heart-pulse',
  hotel: 'bed', 
  airplane: 'airplane', 
  sofa: 'sofa', 
  'dots-horizontal': 'dots-horizontal',
  parking: 'parking',
  'flower-tulip': 'flower-tulip', 
  monitor: 'monitor',
  school: 'school', 
  flash: 'flash',
  delete: 'delete', 
};

export default function CategoryIcon({
  name,
  color,
  size = 20,
  style
}: CategoryIconProps) {
  // Get the icon name from our map or use a default
  const iconName = (iconMap[name] || 'help-circle') as React.ComponentProps<typeof MaterialCommunityIcons>['name'];

  return (
    <View style={[styles.container, { backgroundColor: color }, style]}>
      <MaterialCommunityIcons name={iconName} size={size} color="white" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});