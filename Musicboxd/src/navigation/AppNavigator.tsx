import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, useColorScheme } from 'react-native';
import { useSelector } from 'react-redux';

import { RootStackParamList, MainTabParamList } from '../types';
import { RootState } from '../store';
import { theme } from '../utils/theme';

// Screens
import HomeScreen from '../screens/Home/HomeScreen';
import PopularThisWeekScreen from '../screens/Home/PopularThisWeekScreen';
import NewFromFriendsScreen from '../screens/Home/NewFromFriendsScreen';
import PopularWithFriendsScreen from '../screens/Home/PopularWithFriendsScreen';
import SearchScreen from '../screens/Search/SearchScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import UserProfileScreen from '../screens/Profile/UserProfileScreen';
import FollowersScreen from '../screens/Profile/FollowersScreen';
import ListenedAlbumsScreen from '../screens/Profile/ListenedAlbumsScreen';
import UserReviewsScreen from '../screens/Profile/UserReviewsScreen';
import FavoriteAlbumsManagementScreen from '../screens/Profile/FavoriteAlbumsManagementScreen';
import AlbumDetailsScreen from '../screens/Album/AlbumDetailsScreen';
import AuthScreen from '../screens/Auth/AuthScreen';
import DiaryScreen from '../screens/Profile/DiaryScreen';
import DiaryEntryDetailsScreen from '../screens/Profile/DiaryEntryDetailsScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Tab icon component to avoid creating it during render
const TabIcon = ({ routeName, color, size }: { routeName: string; color: string; size: number }) => {
  let iconText: string;

  switch (routeName) {
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
};

// Create tab bar icon function outside component
const createTabBarIcon = (routeName: string) => ({ color, size }: { color: string; size: number }) => (
  <TabIcon routeName={routeName} color={color} size={size} />
);

// Create stack navigators for each tab to handle nested navigation
const HomeStack = createStackNavigator();
const SearchStack = createStackNavigator();
const ProfileStack = createStackNavigator();

function HomeStackNavigator() {
  const isDark = useColorScheme() === 'dark';
  const currentTheme = isDark ? theme.dark : theme.light;

  return (
    <HomeStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: currentTheme.colors.surface,
        },
        headerTintColor: currentTheme.colors.onSurface,
      }}
    >
      <HomeStack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ title: 'Musicboxd' }}
      />
      <HomeStack.Screen
        name="PopularThisWeek"
        component={PopularThisWeekScreen}
        options={{
          headerShown: false,
        }}
      />
      <HomeStack.Screen
        name="NewFromFriends"
        component={NewFromFriendsScreen}
        options={{
          headerShown: false,
        }}
      />
      <HomeStack.Screen
        name="PopularWithFriends"
        component={PopularWithFriendsScreen}
        options={{
          headerShown: false,
        }}
      />
      <HomeStack.Screen
        name="AlbumDetails"
        component={AlbumDetailsScreen}
        options={{
          title: 'Album Details',
        }}
      />
      <HomeStack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{
          headerShown: false,
        }}
      />
      <HomeStack.Screen
        name="Followers"
        component={FollowersScreen}
        options={{
          headerShown: false,
        }}
      />
      <HomeStack.Screen
        name="ListenedAlbums"
        component={ListenedAlbumsScreen}
        options={{
          headerShown: false,
        }}
      />
      <HomeStack.Screen
        name="UserReviews"
        component={UserReviewsScreen}
        options={{
          headerShown: false,
        }}
      />
      <HomeStack.Screen
        name="FavoriteAlbumsManagement"
        component={FavoriteAlbumsManagementScreen}
        options={{
          headerShown: false,
        }}
      />
      <HomeStack.Screen
        name="Diary"
        component={DiaryScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="DiaryEntryDetails"
        component={DiaryEntryDetailsScreen}
        options={{ title: 'Diary Entry' }}
      />
    </HomeStack.Navigator>
  );
}

function SearchStackNavigator() {
  const isDark = useColorScheme() === 'dark';
  const currentTheme = isDark ? theme.dark : theme.light;

  return (
    <SearchStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: currentTheme.colors.surface,
        },
        headerTintColor: currentTheme.colors.onSurface,
      }}
    >
      <SearchStack.Screen
        name="SearchMain"
        component={SearchScreen}
        options={{ title: 'Search' }}
      />
      <SearchStack.Screen
        name="PopularThisWeek"
        component={PopularThisWeekScreen}
        options={{
          headerShown: false,
        }}
      />
      <SearchStack.Screen
        name="NewFromFriends"
        component={NewFromFriendsScreen}
        options={{
          headerShown: false,
        }}
      />
      <SearchStack.Screen
        name="PopularWithFriends"
        component={PopularWithFriendsScreen}
        options={{
          headerShown: false,
        }}
      />
      <SearchStack.Screen
        name="AlbumDetails"
        component={AlbumDetailsScreen}
        options={{
          title: 'Album Details',
        }}
      />
      <SearchStack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{
          headerShown: false,
        }}
      />
      <SearchStack.Screen
        name="Followers"
        component={FollowersScreen}
        options={{
          headerShown: false,
        }}
      />
      <SearchStack.Screen
        name="ListenedAlbums"
        component={ListenedAlbumsScreen}
        options={{
          headerShown: false,
        }}
      />
      <SearchStack.Screen
        name="UserReviews"
        component={UserReviewsScreen}
        options={{
          headerShown: false,
        }}
      />
      <SearchStack.Screen
        name="FavoriteAlbumsManagement"
        component={FavoriteAlbumsManagementScreen}
        options={{
          headerShown: false,
        }}
      />
      <SearchStack.Screen
        name="Diary"
        component={DiaryScreen}
        options={{ headerShown: false }}
      />
      <SearchStack.Screen
        name="DiaryEntryDetails"
        component={DiaryEntryDetailsScreen}
        options={{ title: 'Diary Entry' }}
      />
    </SearchStack.Navigator>
  );
}

function ProfileStackNavigator() {
  const isDark = useColorScheme() === 'dark';
  const currentTheme = isDark ? theme.dark : theme.light;

  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: currentTheme.colors.surface,
        },
        headerTintColor: currentTheme.colors.onSurface,
      }}
    >
      <ProfileStack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <ProfileStack.Screen
        name="PopularThisWeek"
        component={PopularThisWeekScreen}
        options={{
          headerShown: false,
        }}
      />
      <ProfileStack.Screen
        name="NewFromFriends"
        component={NewFromFriendsScreen}
        options={{
          headerShown: false,
        }}
      />
      <ProfileStack.Screen
        name="PopularWithFriends"
        component={PopularWithFriendsScreen}
        options={{
          headerShown: false,
        }}
      />
      <ProfileStack.Screen
        name="AlbumDetails"
        component={AlbumDetailsScreen}
        options={{
          title: 'Album Details',
        }}
      />
      <ProfileStack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{
          headerShown: false,
        }}
      />
      <ProfileStack.Screen
        name="Followers"
        component={FollowersScreen}
        options={{
          headerShown: false,
        }}
      />
      <ProfileStack.Screen
        name="ListenedAlbums"
        component={ListenedAlbumsScreen}
        options={{
          headerShown: false,
        }}
      />
      <ProfileStack.Screen
        name="UserReviews"
        component={UserReviewsScreen}
        options={{
          headerShown: false,
        }}
      />
      <ProfileStack.Screen
        name="FavoriteAlbumsManagement"
        component={FavoriteAlbumsManagementScreen}
        options={{
          headerShown: false,
        }}
      />
      <ProfileStack.Screen
        name="Diary"
        component={DiaryScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen
        name="DiaryEntryDetails"
        component={DiaryEntryDetailsScreen}
        options={{ title: 'Diary Entry' }}
      />
    </ProfileStack.Navigator>
  );
}

function MainTabNavigator() {
  const isDark = useColorScheme() === 'dark';
  const currentTheme = isDark ? theme.dark : theme.light;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: createTabBarIcon(route.name),
        tabBarActiveTintColor: currentTheme.colors.primary,
        tabBarInactiveTintColor: isDark ? '#666' : '#999',
        tabBarStyle: {
          backgroundColor: currentTheme.colors.surface,
        },
        headerShown: false, // Hide headers since they're handled by stack navigators
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStackNavigator}
      />
      <Tab.Screen 
        name="Search" 
        component={SearchStackNavigator}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStackNavigator}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const colorScheme = useColorScheme();
  const currentTheme = colorScheme === 'dark' ? theme.dark : theme.light;
  const { user } = useSelector((state: RootState) => state.auth);

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
        {user ? (
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
        ) : (
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{
              headerShown: false,
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}