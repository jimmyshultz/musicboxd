import React, { useEffect } from 'react';
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

import { RootStackParamList } from '../../types';
import { RootState } from '../../store';
import { setPopularAlbums, fetchAlbumsStart, fetchAlbumsSuccess } from '../../store/slices/albumSlice';
import { AlbumService } from '../../services/albumService';
import { colors, spacing } from '../../utils/theme';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');
const ALBUM_CARD_WIDTH = (width - spacing.lg * 3) / 2;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const dispatch = useDispatch();
  
  const { popularAlbums, loading } = useSelector((state: RootState) => state.albums);

  useEffect(() => {
    loadPopularAlbums();
  }, []);

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

  const renderAlbumCard = (album: any, index: number) => (
    <TouchableOpacity
      key={album.id}
      style={[
        styles.albumCard,
        index % 2 === 0 ? styles.leftCard : styles.rightCard,
      ]}
      onPress={() => navigateToAlbum(album.id)}
    >
      <Card style={styles.card} elevation={2}>
        <Image source={{ uri: album.coverImageUrl }} style={styles.albumCover} />
        <View style={styles.albumInfo}>
          <Text variant="titleSmall" numberOfLines={2} style={styles.albumTitle}>
            {album.title}
          </Text>
          <Text variant="bodySmall" numberOfLines={1} style={styles.artistName}>
            {album.artist}
          </Text>
          <Text variant="bodySmall" style={styles.albumYear}>
            {AlbumService.getAlbumYear(album.releaseDate)}
          </Text>
        </View>
      </Card>
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

      <View style={styles.albumGrid}>
        {popularAlbums.map((album, index) => renderAlbumCard(album, index))}
      </View>

      <View style={styles.section}>
        <Text variant="headlineSmall" style={styles.sectionTitle}>
          Recent Activity
        </Text>
        <Card style={styles.activityCard} elevation={1}>
          <Card.Content>
            <Text variant="bodyMedium" style={styles.comingSoonText}>
              Activity feed coming soon! Follow friends and see what they're listening to.
            </Text>
          </Card.Content>
        </Card>
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
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
  },
  albumCard: {
    width: ALBUM_CARD_WIDTH,
    marginBottom: spacing.lg,
  },
  leftCard: {
    marginRight: spacing.md,
  },
  rightCard: {
    marginLeft: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
  },
  albumCover: {
    width: '100%',
    height: ALBUM_CARD_WIDTH,
    resizeMode: 'cover',
  },
  albumInfo: {
    padding: spacing.md,
  },
  albumTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  artistName: {
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  albumYear: {
    color: colors.textSecondary,
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