import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Text, Card, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useDispatch, useSelector } from 'react-redux';

import { HomeStackParamList, User } from '../../types';
import { RootState } from '../../store';
import { setPopularAlbums, fetchAlbumsStart, fetchAlbumsSuccess } from '../../store/slices/albumSlice';
import { AlbumService } from '../../services/albumService';
import { userService } from '../../services/userService';
import { colors, spacing } from '../../utils/theme';

type HomeScreenNavigationProp = StackNavigationProp<HomeStackParamList>;

const { width } = Dimensions.get('window');
const ALBUM_CARD_WIDTH = 120;
const USER_CARD_WIDTH = 140;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const dispatch = useDispatch();
  
  const { popularAlbums, loading } = useSelector((state: RootState) => state.albums);
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);

  const loadSuggestedUsers = useCallback(async () => {
    try {
      // Use actual current user ID instead of hardcoded value
      const currentUserId = currentUser?.id || 'current-user-id';
      const users = await userService.getSuggestedUsers(currentUserId, 3);
      setSuggestedUsers(users);
    } catch (error) {
      console.error('Error loading suggested users:', error);
    }
  }, [currentUser]);

  useEffect(() => {
    loadPopularAlbums();
    loadSuggestedUsers();
  }, [loadSuggestedUsers]);

  const loadPopularAlbums = async () => {
    dispatch(fetchAlbumsStart());
    try {
      const response = await AlbumService.getPopularAlbums();
      if (response.success) {
        dispatch(setPopularAlbums(response.data));
        dispatch(fetchAlbumsSuccess(response.data));
      }
    } catch (error) {
      console.error('Error loading albums:', error);
    }
  };

  const navigateToAlbum = (albumId: string) => {
    navigation.navigate('AlbumDetails', { albumId });
  };

  const navigateToUserProfile = (userId: string) => {
    navigation.navigate('UserProfile', { userId });
  };

  const renderAlbumCard = (album: any, index: number) => (
    <TouchableOpacity
      key={album.id}
      style={styles.albumCard}
      onPress={() => navigateToAlbum(album.id)}
    >
      <Image source={{ uri: album.coverImageUrl }} style={styles.albumCover} />
      <Text variant="bodySmall" numberOfLines={2} style={styles.albumTitle}>
        {album.title}
      </Text>
      <Text variant="bodySmall" numberOfLines={1} style={styles.artistName}>
        {album.artist}
      </Text>
    </TouchableOpacity>
  );

  const renderUserCard = (user: User, index: number) => (
    <TouchableOpacity
      key={user.id}
      style={styles.userCard}
      onPress={() => navigateToUserProfile(user.id)}
    >
      <Image 
        source={{ uri: user.profilePicture || 'https://via.placeholder.com/60x60/cccccc/999999?text=User' }} 
        style={styles.userAvatar} 
      />
      <Text variant="bodySmall" numberOfLines={1} style={styles.username}>
        @{user.username}
      </Text>
      <Text variant="bodySmall" numberOfLines={2} style={styles.userBio}>
        {user.bio || 'Music enthusiast'}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={styles.loadingText}>
          Loading albums...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text variant="headlineMedium" style={styles.sectionTitle}>
          Popular Albums
        </Text>
        <Text variant="bodyMedium" style={styles.sectionSubtitle}>
          Discover what's trending in music
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.albumGrid}>
          {popularAlbums.map((album, index) => renderAlbumCard(album, index))}
        </View>
      </ScrollView>

      <View style={styles.section}>
        <Text variant="headlineSmall" style={styles.sectionTitle}>
          Discover Friends
        </Text>
        <Text variant="bodyMedium" style={styles.sectionSubtitle}>
          Find users with similar music taste
        </Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.userGrid}>
            {suggestedUsers.map((user, index) => renderUserCard(user, index))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text variant="headlineSmall" style={styles.sectionTitle}>
          Discover New Music
        </Text>
        <Card style={styles.discoverCard} elevation={1}>
          <Card.Content>
            <Text variant="bodyMedium" style={styles.comingSoonText}>
              Personalized recommendations based on your listening history and preferences.
            </Text>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
  },
  section: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    color: colors.textSecondary,
  },
  albumGrid: {
    flexDirection: 'row',
    paddingLeft: spacing.lg,
  },
  albumCard: {
    width: ALBUM_CARD_WIDTH,
    marginRight: spacing.md,
  },
  albumCover: {
    width: ALBUM_CARD_WIDTH,
    height: ALBUM_CARD_WIDTH,
    borderRadius: 8,
    marginBottom: spacing.sm,
    resizeMode: 'cover',
  },
  albumTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  artistName: {
    color: colors.textSecondary,
  },
  userGrid: {
    flexDirection: 'row',
    paddingLeft: spacing.lg,
  },
  userCard: {
    width: USER_CARD_WIDTH,
    marginRight: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: spacing.sm,
  },
  username: {
    fontWeight: '600',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  userBio: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 12,
  },
  activityCard: {
    backgroundColor: colors.card,
    marginHorizontal: spacing.lg,
  },
  discoverCard: {
    backgroundColor: colors.card,
    marginHorizontal: spacing.lg,
  },
  comingSoonText: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});