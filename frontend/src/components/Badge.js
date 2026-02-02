import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const BADGE_COLORS = {
  default: { bg: '#e0e0e0', text: '#333' },
  primary: { bg: '#4a90d9', text: '#fff' },
  success: { bg: '#27ae60', text: '#fff' },
  warning: { bg: '#f39c12', text: '#fff' },
  danger: { bg: '#e74c3c', text: '#fff' },
  info: { bg: '#3498db', text: '#fff' },
  // Status badges
  scheduled: { bg: '#95a5a6', text: '#fff' },
  active: { bg: '#27ae60', text: '#fff' },
  finished: { bg: '#3498db', text: '#fff' },
  cancelled: { bg: '#e74c3c', text: '#fff' },
  pending: { bg: '#f39c12', text: '#fff' },
  approved: { bg: '#27ae60', text: '#fff' },
  rejected: { bg: '#e74c3c', text: '#fff' },
  waitlisted: { bg: '#9b59b6', text: '#fff' },
  // Skill levels
  beginner: { bg: '#27ae60', text: '#fff' },
  intermediate: { bg: '#3498db', text: '#fff' },
  advanced: { bg: '#f39c12', text: '#fff' },
  expert: { bg: '#e74c3c', text: '#fff' },
};

export const Badge = ({ text, variant = 'default', style = {} }) => {
  const colors = BADGE_COLORS[variant] || BADGE_COLORS.default;
  
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, style]}>
      <Text style={[styles.text, { color: colors.text }]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
