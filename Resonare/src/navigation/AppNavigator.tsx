/* eslint-disable react/no-unstable-nested-components */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/FontAwesome';

import { RootStackParamList, MainTabParamList } from '../types';
import { RootState } from '../store';
import { prefetchProfileImages } from '../services/imagePrefetchService';

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
import ArtistDetailsScreen from '../screens/Artist/ArtistDetailsScreen';
import AuthScreen from '../screens/Auth/AuthScreen';
import ProfileSetupScreen from '../screens/Auth/ProfileSetupScreen';
import TermsAcceptanceScreen from '../screens/Auth/TermsAcceptanceScreen';
import DiaryScreen from '../screens/Profile/DiaryScreen';
import DiaryEntryDetailsScreen from '../screens/Profile/DiaryEntryDetailsScreen';
import EditProfileScreen from '../screens/Profile/EditProfileScreen';
import SettingsScreen from '../screens/Profile/SettingsScreen';
import FollowRequestsScreen from '../screens/Profile/FollowRequestsScreen';
import BlockedUsersScreen from '../screens/Profile/BlockedUsersScreen';
import NotificationsScreen from '../screens/Profile/NotificationsScreen';
import NotificationSettingsScreen from '../screens/Profile/NotificationSettingsScreen';
import { NotificationBadge } from '../components/NotificationBadge';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Back button component
const BackButton = React.memo(({ navigation, customOnPress }: { navigation: any; customOnPress?: () => void }) => {
  const theme = useTheme();

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
      <Icon name="arrow-left" size={18} color={theme.colors.onSurface} />
    </TouchableOpacity>
  );
});



// Tab icon component for non-Profile tabs
const TabIcon = ({ routeName, color, size }: { routeName: string; color: string; size: number }) => {
  let iconName: string;

  switch (routeName) {
    case 'Home':
      iconName = 'home';
      break;
    case 'Search':
      iconName = 'search';
      break;
    case 'Profile':
      iconName = 'user';
      break;
    default:
      iconName = 'question';
  }

  return <Icon name={iconName} size={size} color={color} />;
};

// Profile tab icon component (no badge needed)
const ProfileTabIcon = ({ color, size }: { color: string; size: number }) => {
  return <Icon name="user" size={size} color={color} />;
};

// Notification bell icon component for Home header (needs hooks)
const NotificationBellIcon = ({ navigation }: { navigation: any }) => {
  const theme = useTheme();
  const unreadCount = useSelector((state: RootState) => state.notifications.unreadCount);

  // Log when unreadCount changes to verify re-renders
  React.useEffect(() => {
    console.log('🔔 NotificationBellIcon unreadCount changed to:', unreadCount);
  }, [unreadCount]);

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Notifications')}
      style={notificationBellStyles.container}
    >
      <Icon name="bell" size={24} color={theme.colors.onSurface} />
      <NotificationBadge count={unreadCount} />
    </TouchableOpacity>
  );
};

// Create tab bar icon function outside component
const createTabBarIcon = (routeName: string) => ({ color, size }: { color: string; size: number }) => {
  if (routeName === 'Profile') {
    return <ProfileTabIcon color={color} size={size} />;
  }
  return <TabIcon routeName={routeName} color={color} size={size} />;
};

// Create stack navigators for each tab to handle nested navigation
const HomeStack = createStackNavigator();
const SearchStack = createStackNavigator();
const ProfileStack = createStackNavigator();

function HomeStackNavigator() {
  const theme = useTheme();

  return (
    <HomeStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
      }}
    >
      <HomeStack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={({ navigation }) => ({
          title: 'Resonare',
          headerBackVisible: false,
          headerLeft: () => null,
          headerRight: () => <NotificationBellIcon navigation={navigation} />,
        })}
      />
      <HomeStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: 'Notifications',
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
        name="ArtistDetails"
        component={ArtistDetailsScreen}
        options={({ navigation }) => ({
          title: 'Artist',
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
        options={({ navigation }) => ({
          title: 'Diary Entry',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} />
        })}
      />
    </HomeStack.Navigator>
  );
}

function SearchStackNavigator() {
  const theme = useTheme();

  return (
    <SearchStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
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
        name="ArtistDetails"
        component={ArtistDetailsScreen}
        options={({ navigation }) => ({
          title: 'Artist',
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
        options={({ navigation }) => ({
          title: 'Diary Entry',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} />
        })}
      />
    </SearchStack.Navigator>
  );
}

function ProfileStackNavigator() {
  const theme = useTheme();

  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
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
        name="ArtistDetails"
        component={ArtistDetailsScreen}
        options={({ navigation }) => ({
          title: 'Artist',
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
        options={({ navigation }) => ({
          title: 'Diary Entry',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} />
        })}
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
      <ProfileStack.Screen
        name="FollowRequests"
        component={FollowRequestsScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: 'Follow Requests',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} customOnPress={() => {
            navigation.goBack();
          }} />,
        })}
      />
      <ProfileStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: 'Notifications',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} customOnPress={() => {
            navigation.goBack();
          }} />,
        })}
      />
      <ProfileStack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={({ navigation }) => ({
          title: 'Edit Profile',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} />,
        })}
      />
      <ProfileStack.Screen
        name="BlockedUsers"
        component={BlockedUsersScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: 'Blocked Users',
          headerBackVisible: false,
          headerLeft: () => <BackButton navigation={navigation} customOnPress={() => {
            navigation.goBack();
          }} />,
        })}
      />
      <ProfileStack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: 'Notification Settings',
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
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: createTabBarIcon(route.name),
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
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
  const theme = useTheme();
  const { user } = useSelector((state: RootState) => state.auth);

  // Prefetch profile images when user becomes authenticated
  React.useEffect(() => {
    if (user?.id) {
      prefetchProfileImages(user.id);
    }
  }, [user?.id]);

  // Check if user needs to accept terms
  const needsTermsAcceptance = user && !user.termsAcceptedAt;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.onSurface,
        }}
      >
        {user ? (
          needsTermsAcceptance ? (
            // User is logged in but hasn't accepted terms yet
            <Stack.Screen
              name="TermsAcceptance"
              component={TermsAcceptanceScreen}
              options={{
                title: 'Terms of Service',
                headerBackVisible: false,
                headerLeft: () => null,
              }}
            />
          ) : (
            // User is logged in and has accepted terms
            <Stack.Screen
              name="Main"
              component={MainTabNavigator}
              options={{ headerShown: false }}
            />
          )
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

// Styles for NotificationBellIcon component
const notificationBellStyles = StyleSheet.create({
  container: {
    marginRight: 16,
    position: 'relative',
  },
});