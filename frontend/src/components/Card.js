import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export const Card = ({ children, onPress, style = {} }) => {
  const Wrapper = onPress ? TouchableOpacity : View;
  
  return (
    <Wrapper style={[styles.card, style]} onPress={onPress}>
      {children}
    </Wrapper>
  );
};

export const CardTitle = ({ children }) => (
  <Text style={styles.title}>{children}</Text>
);

export const CardSubtitle = ({ children }) => (
  <Text style={styles.subtitle}>{children}</Text>
);

export const CardBody = ({ children }) => (
  <View style={styles.body}>{children}</View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  body: {
    marginTop: 8,
  },
});
