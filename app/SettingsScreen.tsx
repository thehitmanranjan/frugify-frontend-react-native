import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, Text, FlatList, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, Divider, Switch, Dialog, Portal, TextInput as PaperTextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';

import Header from '../components/Header';
import CategoryIcon from '../components/CategoryIcon';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, Category } from '../hooks/useCategories';
import { RootStackParamList } from '../App';

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
];

interface CategoryItemProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (id: number) => void;
}

function CategoryItem({ category, onEdit, onDelete }: CategoryItemProps) {
  return (
    <Card style={styles.categoryCard}>
      <View style={styles.categoryContent}>
        <View style={styles.categoryInfo}>
          <CategoryIcon name={category.icon} color={category.color} size={18} />
          <Text style={styles.categoryName}>{category.name}</Text>
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

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  
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
  const expenseCategories = categories?.filter(c => c.type === 'expense') || [];
  const incomeCategories = categories?.filter(c => c.type === 'income') || [];
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
    <SafeAreaView style={styles.container}>
      <Header />
      
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Categories</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddCategory}
          >
            <MaterialCommunityIcons name="plus" size={20} color="white" />
            <Text style={styles.addButtonText}>Add Category</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, currentTab === 'expense' && styles.activeTab]}
            onPress={() => setCurrentTab('expense')}
          >
            <Text style={[styles.tabText, currentTab === 'expense' && styles.activeTabText]}>
              Expense
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, currentTab === 'income' && styles.activeTab]}
            onPress={() => setCurrentTab('income')}
          >
            <Text style={[styles.tabText, currentTab === 'income' && styles.activeTabText]}>
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
              <Text style={styles.emptyText}>
                No {currentTab} categories found. Add one to get started!
              </Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      </View>
      
      {/* Add/Edit Category Dialog */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>
            {editingCategory ? 'Edit Category' : 'Add Category'}
          </Dialog.Title>
          
          <Dialog.Content>
            <PaperTextInput
              label="Category Name"
              value={categoryName}
              onChangeText={setCategoryName}
              style={styles.input}
            />
            
            <Text style={styles.sectionTitle}>Color</Text>
            <View style={styles.colorGrid}>
              {colorOptions.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.selectedColorOption,
                  ]}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>
            
            <Text style={styles.sectionTitle}>Icon</Text>
            <View style={styles.iconGrid}>
              {iconOptions.map((icon) => (
                <TouchableOpacity
                  key={icon.name}
                  style={[
                    styles.iconOption,
                    selectedIcon === icon.name && styles.selectedIconOption,
                  ]}
                  onPress={() => setSelectedIcon(icon.name)}
                >
                  <CategoryIcon 
                    name={icon.name} 
                    color={selectedIcon === icon.name ? selectedColor : '#ccc'} 
                    size={16}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </Dialog.Content>
          
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleSaveCategory}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3',
  },
  tabText: {
    color: '#666',
    fontWeight: '500',
    fontSize: 16,
  },
  activeTabText: {
    color: '#2196F3',
  },
  listContent: {
    paddingBottom: 20,
  },
  categoryCard: {
    marginBottom: 12,
    padding: 12,
  },
  categoryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryName: {
    marginLeft: 8,
    fontSize: 16,
  },
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 8,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    margin: 4,
  },
  selectedColorOption: {
    borderWidth: 2,
    borderColor: '#000',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  iconOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  selectedIconOption: {
    backgroundColor: '#e0e0e0',
  },
});