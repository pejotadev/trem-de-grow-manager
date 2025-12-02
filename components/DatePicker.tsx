import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

interface DatePickerProps {
  label?: string;
  value?: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  error?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  minimumDate,
  maximumDate,
  error,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(value || new Date());

  const handlePress = () => {
    setTempDate(value || new Date());
    setShowPicker(true);
  };

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type === 'set' && selectedDate) {
        onChange(selectedDate);
      }
    } else {
      // iOS - update temp date, wait for user to confirm
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const handleConfirmIOS = () => {
    setShowPicker(false);
    onChange(tempDate);
  };

  const handleCancelIOS = () => {
    setShowPicker(false);
  };

  const handleClear = () => {
    onChange(null);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.input, error && styles.inputError]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Ionicons
          name="calendar-outline"
          size={20}
          color={value ? '#333' : '#999'}
        />
        <Text style={[styles.inputText, !value && styles.placeholder]}>
          {value ? format(value, 'MMM dd, yyyy') : placeholder}
        </Text>
        {value && (
          <TouchableOpacity
            onPress={handleClear}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
      {error && <Text style={styles.error}>{error}</Text>}

      {/* Android: Direct picker */}
      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}

      {/* iOS: Modal with picker */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={handleCancelIOS}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={handleCancelIOS}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>{label || 'Select Date'}</Text>
                <TouchableOpacity onPress={handleConfirmIOS}>
                  <Text style={styles.modalConfirmText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                style={styles.picker}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    gap: 10,
  },
  inputError: {
    borderColor: '#f44336',
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  placeholder: {
    color: '#999',
  },
  error: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 4,
  },
  // iOS Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area bottom
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0288D1',
  },
  picker: {
    height: 216,
  },
});



