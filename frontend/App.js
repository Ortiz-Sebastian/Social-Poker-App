import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import {
  LoginScreen,
  RegisterScreen,
  RoomsScreen,
  SearchScreen,
  RoomDetailScreen,
  CreateRoomScreen,
  ManageRequestsScreen,
  WaitlistScreen,
  MyRequestsScreen,
  ProfileScreen,
  WriteReviewScreen,
} from './src/screens';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Main tabs for authenticated users
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#4a90d9',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#eee',
        },
        headerStyle: {
          backgroundColor: '#1a1a2e',
        },
        headerTintColor: '#fff',
      }}
    >
      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{
          title: 'Search',
          headerShown: false,
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🔍</Text>,
        }}
      />
      <Tab.Screen
        name="RoomsTab"
        component={RoomsScreen}
        options={{
          title: 'My Rooms',
          headerShown: false,
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🎴</Text>,
        }}
      />
      <Tab.Screen
        name="MyRequestsTab"
        component={MyRequestsScreen}
        options={{
          title: 'Requests',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📩</Text>,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
};

// Auth stack for unauthenticated users
const AuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1a1a2e',
        },
        headerTintColor: '#fff',
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: 'Sign In' }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: 'Create Account' }}
      />
    </Stack.Navigator>
  );
};

// Main app stack for authenticated users
const AppStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1a1a2e',
        },
        headerTintColor: '#fff',
      }}
    >
      <Stack.Screen
        name="Main"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RoomDetail"
        component={RoomDetailScreen}
        options={{ title: 'Room Details' }}
      />
      <Stack.Screen
        name="CreateRoom"
        component={CreateRoomScreen}
        options={{ title: 'Create Room' }}
      />
      <Stack.Screen
        name="ManageRequests"
        component={ManageRequestsScreen}
        options={{ title: 'Join Requests' }}
      />
      <Stack.Screen
        name="Waitlist"
        component={WaitlistScreen}
        options={{ title: 'Waitlist' }}
      />
      <Stack.Screen
        name="WriteReview"
        component={WriteReviewScreen}
        options={{ title: 'Write Review' }}
      />
    </Stack.Navigator>
  );
};

// Loading screen component
const LoadingScreen = () => (
  <View style={loadingStyles.container}>
    <ActivityIndicator size="large" color="#4a90d9" />
    <Text style={loadingStyles.text}>Loading...</Text>
  </View>
);

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
  },
});

// Root navigator that switches between auth and app stacks
const RootNavigator = () => {
  const { user, loading } = useAuth();

  console.log('RootNavigator: loading=', loading, 'user=', user ? 'exists' : 'null');

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

// Main App component
export default function App() {
  console.log('App component mounting...');
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
