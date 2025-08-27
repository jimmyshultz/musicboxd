/* eslint-disable react/no-unstable-nested-components */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, useColorScheme, TouchableOpacity, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';

import { RootStackParamList, MainTabParamList } from '../types';
import { RootState } from '../store';
import { theme } from '../utils/theme';

// Screens
import HomeScreen from '../screens/Home/HomeScreen';
import ActivityFeedScreen from '../screens/Home/ActivityFeedScreen';
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
import ProfileSetupScreen from '../screens/Auth/ProfileSetupScreen';
import DiaryScreen from '../screens/Profile/DiaryScreen';
import DiaryEntryDetailsScreen from '../screens/Profile/DiaryEntryDetailsScreen';
import SettingsScreen from '../screens/Profile/SettingsScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Back button component
const BackButton = React.memo(({ navigation, customOnPress }: { navigation: any; customOnPress?: () => void }) => {
  const isDark = useColorScheme() === 'dark';
  const currentTheme = isDark ? theme.dark : theme.light;
  
  const handlePress = React.useCallback(() => {
    if (customOnPress) {
      customOnPress();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [customOnPress, navigation]);

  return (
    <TouchableOpacity 
      onPress={handlePress}
      style={backButtonStyles.container}
    >
      <Text style={[backButtonStyles.text, { color: currentTheme.colors.onSurface }]}>←</Text>
    </TouchableOpacity>
  );
});



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
        options={{ title: 'Musicboxd', headerBackVisible: false, headerLeft: () => null }}
      />
      <HomeStack.Screen
        name="ActivityFeed"
        component={ActivityFeedScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: 'Activity Feed',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} customOnPress={() => {
            navigation.goBack();
          }} />,
        })}
      />
      <HomeStack.Screen
        name="PopularThisWeek"
        component={PopularThisWeekScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: 'Popular This Week',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} customOnPress={() => {
            navigation.goBack();
          }} />,
        })}
      />
      <HomeStack.Screen
        name="NewFromFriends"
        component={NewFromFriendsScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: 'New From Friends',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} customOnPress={() => {
            navigation.goBack();
          }} />,
        })}
      />
      <HomeStack.Screen
        name="PopularWithFriends"
        component={PopularWithFriendsScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: 'Popular With Friends',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} customOnPress={() => {
            navigation.goBack();
          }} />,
        })}
      />
      <HomeStack.Screen
        name="AlbumDetails"
        component={AlbumDetailsScreen}
        options={({ navigation }) => ({
          title: 'Album Details',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} />,
        })}
      />
      <HomeStack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: '',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} customOnPress={() => {
            // Custom logic to skip diary screens
            const state = navigation.getState();
            const routes = state.routes;
            const currentRouteIndex = state.index;
            
            // Look backwards in the route history to find the last non-diary, non-userprofile screen
            let foundValidRoute = false;
            for (let i = currentRouteIndex - 1; i >= 0; i--) {
              const route = routes[i];
              if (route.name !== 'Diary' && route.name !== 'DiaryEntryDetails' && route.name !== 'UserProfile') {
                // Found a valid non-diary, non-userprofile screen, navigate back to it
                navigation.navigate(route.name, route.params);
                foundValidRoute = true;
                return;
              }
            }
            
            // If no valid screen found, go to home
            if (!foundValidRoute) {
              navigation.navigate('HomeMain');
            }
          }} />,
        })}
      />
      <HomeStack.Screen
        name="Followers"
        component={FollowersScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: '',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} />,
        })}
      />
      <HomeStack.Screen
        name="ListenedAlbums"
        component={ListenedAlbumsScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: '',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} />,
        })}
      />
      <HomeStack.Screen
        name="UserReviews"
        component={UserReviewsScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: '',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} />,
        })}
      />
      <HomeStack.Screen
        name="FavoriteAlbumsManagement"
        component={FavoriteAlbumsManagementScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: '',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} />,
        })}
      />
      <HomeStack.Screen
        name="Diary"
        component={DiaryScreen}
        options={{ title: 'Diary', headerBackVisible: false, headerLeft: () => null }}
      />
      <HomeStack.Screen
        name="DiaryEntryDetails"
        component={DiaryEntryDetailsScreen}
        options={{ title: 'Diary Entry', headerBackVisible: false, headerLeft: () => null }}
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
        options={{ title: 'Search', headerBackVisible: false, headerLeft: () => null }}
      />
      <SearchStack.Screen
        name="PopularThisWeek"
        component={PopularThisWeekScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: 'Popular This Week',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} customOnPress={() => {
            navigation.goBack();
          }} />,
        })}
      />
      <SearchStack.Screen
        name="NewFromFriends"
        component={NewFromFriendsScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: 'New From Friends',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} customOnPress={() => {
            navigation.goBack();
          }} />,
        })}
      />
      <SearchStack.Screen
        name="PopularWithFriends"
        component={PopularWithFriendsScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: 'Popular With Friends',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} customOnPress={() => {
            navigation.goBack();
          }} />,
        })}
      />
      <SearchStack.Screen
        name="AlbumDetails"
        component={AlbumDetailsScreen}
        options={({ navigation }) => ({
          title: 'Album Details',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} />,
        })}
      />
      <SearchStack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: '',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} customOnPress={() => {
            // Custom logic to skip diary screens
            const state = navigation.getState();
            const routes = state.routes;
            const currentRouteIndex = state.index;
            
            // Look backwards in the route history to find the last non-diary, non-userprofile screen
            let foundValidRoute = false;
            for (let i = currentRouteIndex - 1; i >= 0; i--) {
              const route = routes[i];
              if (route.name !== 'Diary' && route.name !== 'DiaryEntryDetails' && route.name !== 'UserProfile') {
                // Found a valid non-diary, non-userprofile screen, navigate back to it
                navigation.navigate(route.name, route.params);
                foundValidRoute = true;
                return;
              }
            }
            
            // If no valid screen found, go to search main
            if (!foundValidRoute) {
              navigation.navigate('SearchMain');
            }
          }} />,
        })}
      />
      <SearchStack.Screen
        name="Followers"
        component={FollowersScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: '',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} />,
        })}
      />
      <SearchStack.Screen
        name="ListenedAlbums"
        component={ListenedAlbumsScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: '',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} />,
        })}
      />
      <SearchStack.Screen
        name="UserReviews"
        component={UserReviewsScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: '',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} />,
        })}
      />
      <SearchStack.Screen
        name="FavoriteAlbumsManagement"
        component={FavoriteAlbumsManagementScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: '',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} />,
        })}
      />
      <SearchStack.Screen
        name="Diary"
        component={DiaryScreen}
        options={{ title: 'Diary', headerBackVisible: false, headerLeft: () => null }}
      />
      <SearchStack.Screen
        name="DiaryEntryDetails"
        component={DiaryEntryDetailsScreen}
        options={{ title: 'Diary Entry', headerBackVisible: false, headerLeft: () => null }}
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
        options={{ title: 'Profile', headerBackVisible: false, headerLeft: () => null }}
      />
      <ProfileStack.Screen
        name="PopularThisWeek"
        component={PopularThisWeekScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: 'Popular This Week',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} customOnPress={() => {
            navigation.goBack();
          }} />,
        })}
      />
      <ProfileStack.Screen
        name="NewFromFriends"
        component={NewFromFriendsScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: 'New From Friends',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} customOnPress={() => {
            navigation.goBack();
          }} />,
        })}
      />
      <ProfileStack.Screen
        name="PopularWithFriends"
        component={PopularWithFriendsScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: 'Popular With Friends',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} customOnPress={() => {
            navigation.goBack();
          }} />,
        })}
      />
      <ProfileStack.Screen
        name="AlbumDetails"
        component={AlbumDetailsScreen}
        options={({ navigation }) => ({
          title: 'Album Details',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} />,
        })}
      />
      <ProfileStack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: '',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} customOnPress={() => {
            // Custom logic to skip diary screens
            const state = navigation.getState();
            const routes = state.routes;
            const currentRouteIndex = state.index;
            
            // Look backwards in the route history to find the last non-diary, non-userprofile screen
            let foundValidRoute = false;
            for (let i = currentRouteIndex - 1; i >= 0; i--) {
              const route = routes[i];
              if (route.name !== 'Diary' && route.name !== 'DiaryEntryDetails' && route.name !== 'UserProfile') {
                // Found a valid non-diary, non-userprofile screen, navigate back to it
                navigation.navigate(route.name, route.params);
                foundValidRoute = true;
                return;
              }
            }
            
            // If no valid screen found, go to profile main
            if (!foundValidRoute) {
              navigation.navigate('ProfileMain');
            }
          }} />,
        })}
      />
      <ProfileStack.Screen
        name="Followers"
        component={FollowersScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: '',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} />,
        })}
      />
      <ProfileStack.Screen
        name="ListenedAlbums"
        component={ListenedAlbumsScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: '',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} />,
        })}
      />
      <ProfileStack.Screen
        name="UserReviews"
        component={UserReviewsScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: '',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} />,
        })}
      />
      <ProfileStack.Screen
        name="FavoriteAlbumsManagement"
        component={FavoriteAlbumsManagementScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: '',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} />,
        })}
      />
      <ProfileStack.Screen
        name="Diary"
        component={DiaryScreen}
        options={{ title: 'Diary', headerBackVisible: false, headerLeft: () => null }}
      />
      <ProfileStack.Screen
        name="DiaryEntryDetails"
        component={DiaryEntryDetailsScreen}
        options={{ title: 'Diary Entry', headerBackVisible: false, headerLeft: () => null }}
      />
      <ProfileStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: 'Settings',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} customOnPress={() => {
            navigation.goBack();
          }} />,
        })}
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
          <>
            <Stack.Screen
              name="Auth"
              component={AuthScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="ProfileSetup"
              component={ProfileSetupScreen}
              options={{
                title: 'Profile Setup',
                headerBackVisible: false,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Styles for BackButton component
const backButtonStyles = StyleSheet.create({
  container: {
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
  },
  text: {
    fontSize: 18,
  },
});