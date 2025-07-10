import React, { useState } from 'react';
import { View, StyleSheet, Text, FlatList, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, Dialog, Portal, TextInput as PaperTextInput, useTheme as usePaperTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';

import Header from '../components/Header';
import CategoryIcon from '../components/CategoryIcon';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, Category } from '../hooks/useCategories';
import { RootStackParamList } from '../App';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = StackNavigationProp<RootStackParamList>;

// Color options for categories
const colorOptions = [
  '#F44336', // Red
  '#E91E63', // Pink
  '#9C27B0', // Purple
  '#673AB7', // Deep Purple
  '#3F51B5', // Indigo
  '#2196F3', // Blue
  '#03A9F4', // Light Blue
  '#00BCD4', // Cyan
  '#009688', // Teal
  '#4CAF50', // Green
  '#8BC34A', // Light Green
  '#CDDC39', // Lime
  '#FFEB3B', // Yellow
  '#FFC107', // Amber
  '#FF9800', // Orange
  '#FF5722', // Deep Orange
  '#795548', // Brown
  '#607D8B', // Blue Grey
];

// Icon options for categories
const iconOptions = [
  { name: 'home', label: 'Home' },
  { name: 'shopping-bag', label: 'Shopping' },
  { name: 'utensils', label: 'Food' },
  { name: 'credit-card', label: 'Bills' },
  { name: 'film', label: 'Entertainment' },
  { name: 'map', label: 'Transport' },
  { name: 'book', label: 'Education' },
  { name: 'briefcase', label: 'Work' },
  { name: 'activity', label: 'Health' },
  { name: 'gift', label: 'Gifts' },
  { name: 'banknote', label: 'Income' },
  { name: 'trending-up', label: 'Investments' },
  { name: 'shower', label: 'Body Care' },
  { name: 'car', label: 'Cab' },
  { name: 'tshirt-crew', label: 'Clothes' },
  { name: 'cellphone', label: 'Communications' },
  { name: 'hand-heart', label: 'Donation' },
  { name: 'silverware-fork-knife', label: 'Eating Out' },
  { name: 'food', label: 'Ordered Food' },
  { name: 'account-group', label: 'Family' },
  { name: 'gas-station', label: 'Fuel' },
  { name: 'laptop', label: 'Gadgets' },
  { name: 'heart-pulse', label: 'Health' },
  { name: 'hotel', label: 'Hotel' },
  { name: 'airplane', label: 'Trip' },
  { name: 'sofa', label: 'House Decor' },
  { name: 'dots-horizontal', label: 'Miscellaneous' },
  { name: 'parking', label: 'Parking' },
  { name: 'flower-tulip', label: 'Puja' },
  { name: 'monitor', label: 'Tech' },
  { name: 'school', label: 'Study' },
  { name: 'flash', label: 'Utilities' },
  { name: 'delete', label: 'Waste' },
];

interface CategoryItemProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (id: number) => void;
}

function CategoryItem({ category, onEdit, onDelete }: CategoryItemProps) {
  const { theme, isDarkMode } = useTheme();
  // Only override for light mode; keep dark mode as before
  const cardStyle = isDarkMode
    ? styles.categoryCard
    : [
        styles.categoryCard,
        {
          backgroundColor: '#fff',
          borderColor: '#E0E0E0',
          borderWidth: 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 2,
        },
      ];
  const textStyle = isDarkMode
    ? [styles.categoryName, { color: theme.colors.text }]
    : [styles.categoryName, { color: '#222' }];
  return (
    <Card style={cardStyle}>
      <View style={styles.categoryContent}>
        <View style={styles.categoryInfo}>
          <CategoryIcon name={category.icon} color={category.color} size={18} />
          <Text style={textStyle}>{category.name}</Text>
        </View>
        
        <View style={styles.categoryActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onEdit(category)}
          >
            <MaterialCommunityIcons name="pencil" size={20} color="#666" />
          </TouchableOpacity>
          
          {!category.isDefault && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => onDelete(category.id)}
            >
              <MaterialCommunityIcons name="delete" size={20} color="#F44336" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Card>
  );
}

export default function CategoriesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const paperTheme = usePaperTheme();
  
  // Category data and mutations
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  
  // UI state
  const [dialogVisible, setDialogVisible] = useState(false);
  const [currentTab, setCurrentTab] = useState<'expense' | 'income'>('expense');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  // Form state
  const [categoryName, setCategoryName] = useState('');
  const [selectedColor, setSelectedColor] = useState(colorOptions[0]);
  const [selectedIcon, setSelectedIcon] = useState(iconOptions[0].name);
  
  // Filter categories by type
  const expenseCategories = (categories?.filter(c => c.type === 'expense').sort((a, b) => a.name.localeCompare(b.name))) || [];
  const incomeCategories = (categories?.filter(c => c.type === 'income').sort((a, b) => a.name.localeCompare(b.name))) || [];
  const displayedCategories = currentTab === 'expense' ? expenseCategories : incomeCategories;
  
  // Open dialog for adding a new category
  const handleAddCategory = () => {
    setEditingCategory(null);
    setCategoryName('');
    setSelectedColor(colorOptions[0]);
    setSelectedIcon(iconOptions[0].name);
    setDialogVisible(true);
  };
  
  // Open dialog for editing an existing category
  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setSelectedColor(category.color);
    setSelectedIcon(category.icon);
    setDialogVisible(true);
  };
  
  // Delete category with confirmation
  const handleDeleteCategory = (id: number) => {
    Alert.alert(
      'Delete Category',
      'Are you sure you want to delete this category? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        { 
          text: 'Delete', 
          onPress: () => {
            deleteCategory.mutate(id);
          },
          style: 'destructive',
        },
      ],
    );
  };
  
  // Save category (create or update)
  const handleSaveCategory = () => {
    if (!categoryName.trim()) {
      Alert.alert('Error', 'Category name is required');
      return;
    }
    
    if (editingCategory) {
      // Update existing category
      updateCategory.mutate({
        id: editingCategory.id,
        name: categoryName,
        color: selectedColor,
        icon: selectedIcon,
      });
    } else {
      // Create new category
      createCategory.mutate({
        name: categoryName,
        type: currentTab,
        color: selectedColor,
        icon: selectedIcon,
      });
    }
    
    setDialogVisible(false);
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header showBackButton={true} title="Categories" />
      
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleAddCategory}
          >
            <MaterialCommunityIcons name="plus" size={20} color={theme.colors.surface} />
            <Text style={[styles.addButtonText, { color: theme.colors.surface }]}>Add Category</Text>
          </TouchableOpacity>
        </View>
        
        <View style={[styles.tabContainer, { borderBottomColor: theme.colors.placeholder }]}>
          <TouchableOpacity
            style={[styles.tab, currentTab === 'expense' && styles.activeTab, currentTab === 'expense' && { borderBottomColor: theme.colors.primary }]}
            onPress={() => setCurrentTab('expense')}
          >
            <Text style={[styles.tabText, {color: theme.colors.text }, currentTab === 'expense' && styles.activeTabText, currentTab === 'expense' && { color: theme.colors.primary }]}>
              Expense
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, currentTab === 'income' && styles.activeTab, currentTab === 'income' && { borderBottomColor: theme.colors.primary}]}
            onPress={() => setCurrentTab('income')}
          >
            <Text style={[styles.tabText, {color: theme.colors.text }, currentTab === 'income' && styles.activeTabText, currentTab === 'income' && { color: theme.colors.primary }]}>
              Income
            </Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={displayedCategories}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <CategoryItem 
              category={item} 
              onEdit={handleEditCategory} 
              onDelete={handleDeleteCategory}
            />
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>
                No {currentTab} categories found. Add one to get started!
              </Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      </View>
      
      {/* Add/Edit Category Dialog */}
      <Portal>
        <Dialog
            visible={dialogVisible}
            onDismiss={() => setDialogVisible(false)}
            style={{ maxHeight: '90%', backgroundColor: theme.colors.surface }}
        >
          <Dialog.Title style={{ color: theme.colors.text }}>
            {editingCategory ? 'Edit Category' : 'Add Category'}
          </Dialog.Title>
          <View style={{ maxHeight: 400 }}>
            <FlatList
              data={[1]}
              renderItem={() => (
                <Dialog.Content>
                  <PaperTextInput
                    label="Category Name"
                    value={categoryName}
                    onChangeText={setCategoryName}
                    style={[styles.input, { backgroundColor: theme.colors.background }]}
                    theme={{ colors: { primary: theme.colors.primary, text: theme.colors.text, placeholder: theme.colors.placeholder, background: theme.colors.background } }}
                  />
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Color</Text>
                  <View style={styles.colorGrid}>
                    {colorOptions.map((color) => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorOption,
                          { backgroundColor: color },
                          selectedColor === color && styles.selectedColorOption,
                          selectedColor === color && { borderColor: theme.colors.primary },
                        ]}
                        onPress={() => setSelectedColor(color)}
                      />
                    ))}
                  </View>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Icon</Text>
                  <View style={styles.iconGrid}>
                    {iconOptions.map((icon) => (
                      <TouchableOpacity
                        key={icon.name}
                        style={[
                          styles.iconOption,
                          selectedIcon === icon.name && styles.selectedIconOption,
                          selectedIcon === icon.name && { borderColor: theme.colors.primary },
                        ]}
                        onPress={() => setSelectedIcon(icon.name)}
                      >
                        <CategoryIcon 
                          name={icon.name} 
                          color={selectedIcon === icon.name ? selectedColor : theme.colors.placeholder}
                          size={16}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </Dialog.Content>
              )}
              keyExtractor={() => 'dialog-content'}
              showsVerticalScrollIndicator={false}
            />
          </View>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)} color={theme.colors.primary}>Cancel</Button>
            <Button onPress={handleSaveCategory} color={theme.colors.primary}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  addButtonText: {
    fontWeight: 'bold',
    marginLeft: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontWeight: '500',
  },
  activeTabText: {
    fontWeight: 'bold',
  },
  categoryCard: {
    borderRadius: 8,
    elevation: 1,
    marginBottom: 12,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  categoryInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryName: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedColorOption: {
    borderWidth: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  iconOption: {
    width: '22%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectedIconOption: {
    borderWidth: 2,
  },
});
