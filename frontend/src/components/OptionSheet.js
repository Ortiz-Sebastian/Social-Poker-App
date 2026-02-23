import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, FlatList,
  SafeAreaView, Pressable,
} from 'react-native';

export const OptionSheet = ({ label, options, selectedValue, onValueChange, placeholder }) => {
  const [visible, setVisible] = useState(false);

  const selected = options.find((o) => o.value === selectedValue);
  const displayText = selected?.label || placeholder || 'Select...';

  const handleSelect = (value) => {
    onValueChange(value);
    setVisible(false);
  };

  return (
    <>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.triggerText, !selected && styles.triggerPlaceholder]}>
          {displayText}
        </Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide">
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <View style={styles.sheet}>
            <SafeAreaView>
              <View style={styles.header}>
                <Text style={styles.headerTitle}>{label || 'Select'}</Text>
                <TouchableOpacity onPress={() => setVisible(false)} hitSlop={12}>
                  <Text style={styles.done}>Done</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={options}
                keyExtractor={(item) => String(item.value)}
                renderItem={({ item }) => {
                  const isActive = item.value === selectedValue;
                  return (
                    <TouchableOpacity
                      style={[styles.option, isActive && styles.optionActive]}
                      onPress={() => handleSelect(item.value)}
                    >
                      <Text style={[styles.optionText, isActive && styles.optionTextActive]}>
                        {item.label}
                      </Text>
                      {isActive && <Text style={styles.check}>✓</Text>}
                    </TouchableOpacity>
                  );
                }}
              />
            </SafeAreaView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  triggerText: {
    fontSize: 15,
    color: '#1a1a2e',
    fontWeight: '500',
    flex: 1,
  },
  triggerPlaceholder: {
    color: '#999',
    fontWeight: '400',
  },
  chevron: {
    fontSize: 22,
    color: '#999',
    marginLeft: 8,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  done: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4a90d9',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  optionActive: {
    backgroundColor: '#e8f4fd',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  optionTextActive: {
    color: '#4a90d9',
    fontWeight: '600',
  },
  check: {
    fontSize: 16,
    color: '#4a90d9',
    fontWeight: '700',
  },
});
