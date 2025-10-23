/**
 * Navigation Configuration
 * Handles auth flow and main app navigation
 */

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '../stores/useAuthStore';
import type { RootStackParamList, MainTabParamList, HomeStackParamList } from '../types';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import CategorySelectionScreen from '../screens/CategorySelectionScreen';
import ActionSelectionScreen from '../screens/ActionSelectionScreen';
import CompositionScreen from '../screens/CompositionScreen';
import MyPoemsScreen from '../screens/MyPoemsScreen';
import AppreciationScreen from '../screens/AppreciationScreen';
import RankingScreen from '../screens/RankingScreen';

// ============================================================================
// Navigators
// ============================================================================

const RootStack = createNativeStackNavigator<RootStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

// ============================================================================
// Home Stack Navigator (Nested in Home Tab)
// ============================================================================

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <HomeStack.Screen
        name="CategorySelection"
        component={CategorySelectionScreen}
      />
      <HomeStack.Screen
        name="ActionSelection"
        component={ActionSelectionScreen}
      />
      <HomeStack.Screen
        name="Composition"
        component={CompositionScreen}
      />
      <HomeStack.Screen
        name="Appreciation"
        component={AppreciationScreen}
      />
    </HomeStack.Navigator>
  );
}

// ============================================================================
// Main Tab Navigator (Authenticated)
// ============================================================================

function MainTabNavigator() {
  return (
    <MainTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4A5568',
        tabBarInactiveTintColor: '#A0AEC0',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          backgroundColor: '#FFFFFF',
        },
      }}
    >
      <MainTab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          title: 'ホーム',
          tabBarLabel: 'ホーム',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <MainTab.Screen
        name="Ranking"
        component={RankingScreen}
        options={{
          title: 'ランキング',
          tabBarLabel: 'ランキング',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy" size={size} color={color} />
          ),
        }}
      />
      <MainTab.Screen
        name="MyPoems"
        component={MyPoemsScreen}
        options={{
          title: 'マイページ',
          tabBarLabel: 'マイページ',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </MainTab.Navigator>
  );
}

// ============================================================================
// Root Navigator (Auth Flow)
// ============================================================================

function RootNavigator() {
  const { isAuthenticated, isLoading, loadStoredSession } = useAuthStore();

  // Load stored session on mount
  useEffect(() => {
    loadStoredSession();
  }, [loadStoredSession]);

  // Show loading spinner while checking auth status
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4A5568" />
      </View>
    );
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <RootStack.Screen name="Login" component={LoginScreen} />
      ) : (
        <RootStack.Screen name="Main" component={MainTabNavigator} />
      )}
    </RootStack.Navigator>
  );
}

// ============================================================================
// Navigation Container
// ============================================================================

export default function Navigation() {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}
