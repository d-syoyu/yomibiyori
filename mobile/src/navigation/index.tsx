/**
 * Navigation Configuration
 * Handles auth flow and main app navigation
 */

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '../stores/useAuthStore';
import { useTutorialStore } from '../stores/useTutorialStore';
import type { RootStackParamList, MainTabParamList, HomeStackParamList, MyPoemsStackParamList } from '../types';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import PasswordResetScreen from '../screens/PasswordResetScreen';
import CategorySelectionScreen from '../screens/CategorySelectionScreen';
import ActionSelectionScreen from '../screens/ActionSelectionScreen';
import CompositionScreen from '../screens/CompositionScreen';
import MyPoemsScreen from '../screens/MyPoemsScreen';
import AppreciationScreen from '../screens/AppreciationScreen';
import RankingScreen from '../screens/RankingScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Import components
import ToastContainer from '../components/ToastContainer';
import TutorialModal from '../components/TutorialModal';

// ============================================================================
// Navigators
// ============================================================================

const RootStack = createNativeStackNavigator<RootStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const MyPoemsStack = createNativeStackNavigator<MyPoemsStackParamList>();

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
// MyPoems Stack Navigator (Nested in MyPoems Tab)
// ============================================================================

function MyPoemsStackNavigator() {
  return (
    <MyPoemsStack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTintColor: '#4A5568',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <MyPoemsStack.Screen
        name="MyPoemsList"
        component={MyPoemsScreen}
        options={{
          title: 'マイページ',
          headerShown: false,
        }}
      />
      <MyPoemsStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'プロフィール設定',
          headerBackTitle: '戻る',
        }}
      />
    </MyPoemsStack.Navigator>
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
        component={MyPoemsStackNavigator}
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
// Root Navigator (Guest Mode Support)
// ============================================================================

function RootNavigator() {
  const { isLoading, loadStoredSession } = useAuthStore();

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
      {/* Main app is always accessible */}
      <RootStack.Screen name="Main" component={MainTabNavigator} />
      {/* Login/Auth screens presented as modal */}
      <RootStack.Screen
        name="Login"
        component={LoginScreen}
        options={{ presentation: 'modal' }}
      />
      <RootStack.Screen
        name="PasswordReset"
        component={PasswordResetScreen}
        options={{ presentation: 'modal' }}
      />
    </RootStack.Navigator>
  );
}

// ============================================================================
// Navigation Container
// ============================================================================

export default function Navigation() {
  const { isAuthenticated } = useAuthStore();
  const { tutorialCompleted, isLoading, loadTutorialStatus, completeTutorial } =
    useTutorialStore();
  const [showTutorial, setShowTutorial] = useState(false);

  // Load tutorial status on mount
  useEffect(() => {
    loadTutorialStatus();
  }, [loadTutorialStatus]);

  // Show tutorial when authenticated and not completed
  useEffect(() => {
    if (!isLoading && isAuthenticated && !tutorialCompleted) {
      // Small delay to ensure smooth transition after login
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isAuthenticated, tutorialCompleted]);

  // Handle tutorial close
  const handleTutorialClose = () => {
    setShowTutorial(false);
    completeTutorial();
  };

  return (
    <>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
      <ToastContainer />
      <TutorialModal visible={showTutorial} onClose={handleTutorialClose} />
    </>
  );
}
