import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from 'react-native-paper';
import { useDate } from '../contexts/DateContext';
import { Calendar } from 'react-native-calendars';
import { format } from 'date-fns';

export default function DateSelector() {
  const [calendarVisible, setCalendarVisible] = useState(false);
  const { 
    currentDate, 
    formattedPeriod,
    goToPreviousPeriod, 
    goToNextPeriod,
    resetToToday
  } = useDate();

  const handleDateSelect = (date: any) => {
    // Format from YYYY-MM-DD to a Date object
    const selectedDate = new Date(date.dateString);
    resetToToday(); // This will reset to today but we'll update immediately after
    setCalendarVisible(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={goToPreviousPeriod} style={styles.button}>
        <MaterialCommunityIcons name="chevron-left" size={24} color="#333" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.periodButton}
        onPress={() => setCalendarVisible(true)}
      >
        <Text style={styles.periodText}>{formattedPeriod}</Text>
        <MaterialCommunityIcons name="chevron-down" size={16} color="#333" />
      </TouchableOpacity>
      
      <TouchableOpacity onPress={goToNextPeriod} style={styles.button}>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#333" />
      </TouchableOpacity>

      {/* Calendar Modal */}
      <Modal
        visible={calendarVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calendarContainer}>
            <Calendar
              current={format(currentDate, 'yyyy-MM-dd')}
              onDayPress={handleDateSelect}
              markedDates={{
                [format(currentDate, 'yyyy-MM-dd')]: { selected: true, selectedColor: '#2196F3' }
              }}
              theme={{
                selectedDayBackgroundColor: '#2196F3',
                todayTextColor: '#2196F3',
                arrowColor: '#2196F3',
              }}
            />
            <View style={styles.calendarActions}>
              <Button 
                mode="outlined" 
                onPress={() => setCalendarVisible(false)}
                style={styles.calendarButton}
              >
                Cancel
              </Button>
              <Button 
                mode="contained"
                onPress={() => {
                  resetToToday();
                  setCalendarVisible(false);
                }}
                style={styles.calendarButton}
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
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'white',
  },
  button: {
    padding: 4,
  },
  periodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  periodText: {
    fontSize: 15,
    fontWeight: '500',
    marginRight: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    backgroundColor: 'white',
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
  calendarButton: {
    marginLeft: 8,
  },
});