import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from 'react-native-paper';
import { useDate } from '../contexts/DateContext';
import { useTheme } from '../contexts/ThemeContext'; // Import useTheme
import { Calendar } from 'react-native-calendars';
import { format } from 'date-fns';

export default function DateSelector() {
  const { theme } = useTheme(); // Use theme from context
  const [calendarVisible, setCalendarVisible] = useState(false);
  const { 
    currentDate, 
    formattedPeriod,
    goToPreviousPeriod, 
    goToNextPeriod,
    resetToToday,
    setCurrentDate
  } = useDate();

  const handleDateSelect = (date: any) => {
    // Format from YYYY-MM-DD to a Date object
    const selectedDate = new Date(date.dateString);
    setCurrentDate(selectedDate);
    setCalendarVisible(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <TouchableOpacity onPress={goToPreviousPeriod} style={styles.button}>
        <MaterialCommunityIcons name="chevron-left" size={24} color={theme.colors.text} />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.periodButton}
        onPress={() => setCalendarVisible(true)}
      >
        <Text style={[styles.periodText, { color: theme.colors.text }]}>{formattedPeriod}</Text>
        <MaterialCommunityIcons name="chevron-down" size={16} color={theme.colors.text} />
      </TouchableOpacity>
      
      <TouchableOpacity onPress={goToNextPeriod} style={styles.button}>
        <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.text} />
      </TouchableOpacity>

      {/* Calendar Modal - Modal itself is not directly styled by theme here, but its content is */}
      <Modal
        visible={calendarVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.calendarContainer, { backgroundColor: theme.colors.surface }]}>
            <Calendar
              current={format(currentDate, 'yyyy-MM-dd')}
              onDayPress={handleDateSelect}
              markedDates={{
                [format(currentDate, 'yyyy-MM-dd')]: { selected: true, selectedColor: theme.colors.primary }
              }}
              theme={{
                calendarBackground: theme.colors.surface,
                textSectionTitleColor: theme.colors.placeholder,
                selectedDayBackgroundColor: theme.colors.primary,
                selectedDayTextColor: theme.colors.surface,
                todayTextColor: theme.colors.primary,
                dayTextColor: theme.colors.text,
                textDisabledColor: theme.colors.placeholder,
                dotColor: theme.colors.primary,
                selectedDotColor: theme.colors.surface,
                arrowColor: theme.colors.primary,
                monthTextColor: theme.colors.text,
                indicatorColor: theme.colors.primary,
                // textDayFontFamily: 'monospace',
                // textMonthFontFamily: 'monospace',
                // textDayHeaderFontFamily: 'monospace',
                textDayFontWeight: '300',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '300',
                textDayFontSize: 16,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 16
              }}
            />
            <View style={styles.calendarActions}>
              <Button 
                mode="outlined" 
                onPress={() => setCalendarVisible(false)}
                style={[styles.calendarButton, { borderColor: theme.colors.primary }]}
                labelStyle={{ color: theme.colors.primary }}
              >
                Cancel
              </Button>
              <Button 
                mode="contained"
                onPress={() => {
                  resetToToday();
                  setCalendarVisible(false);
                }}
                style={[styles.calendarButton, { backgroundColor: theme.colors.primary }]}
                labelStyle={{ color: theme.colors.surface }}
              >
                Today
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { // Base container style, background color will be overridden by theme
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
  },
  button: { // Icon color will be overridden by theme
    padding: 4,
  },
  periodButton: { // Text and icon color will be overridden by theme
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  periodText: { // Text color will be overridden by theme
    fontSize: 15,
    fontWeight: '500',
    marginRight: 4,
  },
  modalOverlay: { // Consider if this needs theming (e.g. different overlay color for dark mode)
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: { // Background color will be overridden by theme
    borderRadius: 10,
    padding: 16,
    width: '85%',
    maxWidth: 350,
  },
  calendarActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  calendarButton: { // Button colors will be overridden by theme
    marginLeft: 8,
  },
});