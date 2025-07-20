import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, useColorScheme } from 'react-native';

import { RootStackParamList, MainTabParamList } from '../types';
import { theme } from '../utils/theme';

// Screens
import HomeScreen from '../screens/Home/HomeScreen';
import SearchScreen from '../screens/Search/SearchScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import UserProfileScreen from '../screens/Profile/UserProfileScreen';
import FollowersScreen from '../screens/Profile/FollowersScreen';
import AlbumDetailsScreen from '../screens/Album/AlbumDetailsScreen';
import AuthScreen from '../screens/Auth/AuthScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabNavigator() {
  const isDark = useColorScheme() === 'dark';
  const currentTheme = isDark ? theme.dark : theme.light;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconText: string;

          switch (route.name) {
            case 'Home':
              iconText = '🏠';
              break;
            case 'Search':
              iconText = '🔍';
              break;
            case 'Profile':
              iconText = '👤';
              break;
            default:
              iconText = '❓';
          }

          return <Text style={{ fontSize: size, color }}>{iconText}</Text>;
        },
        tabBarActiveTintColor: currentTheme.colors.primary,
        tabBarInactiveTintColor: isDark ? '#666' : '#999',
        tabBarStyle: {
          backgroundColor: currentTheme.colors.surface,
        },
        headerStyle: {
          backgroundColor: currentTheme.colors.surface,
        },
        headerTintColor: currentTheme.colors.onSurface,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'Musicboxd' }}
      />
      <Tab.Screen 
        name="Search" 
        component={SearchScreen}
        options={{ title: 'Search' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const isDark = useColorScheme() === 'dark';
  const currentTheme = isDark ? theme.dark : theme.light;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: currentTheme.colors.surface,
          },
          headerTintColor: currentTheme.colors.onSurface,
        }}
      >
        <Stack.Screen
          name="Main"
          component={MainTabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AlbumDetails"
          component={AlbumDetailsScreen}
          options={{
            title: 'Album Details',
          }}
        />
        <Stack.Screen
          name="UserProfile"
          component={UserProfileScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Followers"
          component={FollowersScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}