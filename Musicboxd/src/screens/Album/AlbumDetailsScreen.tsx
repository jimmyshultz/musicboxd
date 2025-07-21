import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  ActivityIndicator,
  Chip,
  Divider,
} from 'react-native-paper';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';

import { HomeStackParamList, SearchStackParamList, Track } from '../../types';
import { RootState } from '../../store';
import { 
  setCurrentAlbum, 
  clearCurrentAlbum, 
  setCurrentAlbumUserReview, 
  setCurrentAlbumIsListened,
  addListen 
} from '../../store/slices/albumSlice';
import { AlbumService } from '../../services/albumService';
import { theme, spacing, shadows } from '../../utils/theme';

type AlbumDetailsRouteProp = RouteProp<HomeStackParamList | SearchStackParamList, 'AlbumDetails'>;

const { width } = Dimensions.get('window');
const COVER_SIZE = width * 0.6;

const StarRating = ({ 
  rating, 
  onRatingChange, 
  disabled = false 
}: { 
  rating: number; 
  onRatingChange: (rating: number) => void;
  disabled?: boolean;
}) => {
  return (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity 
          key={star} 
          onPress={() => !disabled && onRatingChange(star)}
          disabled={disabled}
        >
          <Text
            style={[
              styles.star,
              star <= rating ? styles.starFilled : styles.starEmpty,
              disabled && styles.starDisabled
            ]}
          >
            {star <= rating ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const TrackListItem = ({ track }: { track: Track; albumArtist: string }) => (
  <View style={styles.trackItem}>
    <View style={styles.trackNumber}>
      <Text variant="bodySmall" style={styles.trackNumberText}>
        {track.trackNumber}
      </Text>
    </View>
    <View style={styles.trackInfo}>
      <Text variant="bodyMedium" style={styles.trackTitle}>
        {track.title}
      </Text>
      {track.artist && (
        <Text variant="bodySmall" style={styles.trackArtist}>
          {track.artist}
        </Text>
      )}
    </View>
    <Text variant="bodySmall" style={styles.trackDuration}>
      {AlbumService.formatDuration(track.duration)}
    </Text>
  </View>
);

export default function AlbumDetailsScreen() {
  const route = useRoute<AlbumDetailsRouteProp>();
  const dispatch = useDispatch();
  const { albumId } = route.params;
  
  const { currentAlbum, currentAlbumUserReview, currentAlbumIsListened } = useSelector((state: RootState) => state.albums);
  const { user } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadAlbumDetails = useCallback(async () => {
    setLoading(true);
    try {
      const response = await AlbumService.getAlbumById(albumId);
      if (response.success && response.data) {
        dispatch(setCurrentAlbum(response.data));
        
        // Load user's review and listen status if user is logged in
        if (user) {
          const userReview = await AlbumService.getUserReview(user.id, albumId);
          dispatch(setCurrentAlbumUserReview(userReview));
          
          const hasListened = await AlbumService.hasUserListened(user.id, albumId);
          dispatch(setCurrentAlbumIsListened(hasListened));
        }
      }
    } catch (error) {
      console.error('Error loading album details:', error);
    } finally {
      setLoading(false);
    }
  }, [albumId, dispatch, user]);

  useEffect(() => {
    loadAlbumDetails();
    return () => {
      dispatch(clearCurrentAlbum());
    };
  }, [loadAlbumDetails, dispatch]);

  const handleRating = async (rating: number) => {
    if (!user || !currentAlbum || submitting) return;
    
    setSubmitting(true);
    try {
      const response = await AlbumService.addReview(user.id, currentAlbum.id, rating);
      if (response.success) {
        dispatch(setCurrentAlbumUserReview(response.data));
      }
    } catch (error) {
      console.error('Error saving rating:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkAsListened = async () => {
    if (!user || !currentAlbum || submitting) return;
    
    setSubmitting(true);
    try {
      if (currentAlbumIsListened) {
        // Remove listen
        const response = await AlbumService.removeListened(user.id, currentAlbum.id);
        if (response.success) {
          dispatch(setCurrentAlbumIsListened(false));
        }
      } else {
        // Add listen
        const response = await AlbumService.markAsListened(user.id, currentAlbum.id);
        if (response.success) {
          dispatch(setCurrentAlbumIsListened(true));
          dispatch(addListen(response.data));
        }
      }
    } catch (error) {
      console.error('Error updating listen status:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !currentAlbum) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={styles.loadingText}>
          Loading album details...
        </Text>
      </View>
    );
  }

  const totalDuration = AlbumService.getTotalDuration(currentAlbum);
  const albumYear = AlbumService.getAlbumYear(currentAlbum.releaseDate);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Album Header */}
      <View style={styles.header}>
        <Image source={{ uri: currentAlbum.coverImageUrl }} style={styles.albumCover} />
        <View style={styles.albumInfoContainer}>
          <Text variant="headlineMedium" style={styles.albumTitle}>
            {currentAlbum.title}
          </Text>
          <Text variant="titleLarge" style={styles.artistName}>
            {currentAlbum.artist}
          </Text>
          <Text variant="bodyMedium" style={styles.albumMeta}>
            {albumYear} • {currentAlbum.trackList.length} tracks • {AlbumService.formatDuration(totalDuration)}
          </Text>
          
          {/* Genres */}
          <View style={styles.genresContainer}>
            {currentAlbum.genre.map((genre, index) => (
              <Chip key={index} style={styles.genreChip} compact>
                {genre}
              </Chip>
            ))}
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <Button
          mode={currentAlbumIsListened ? "contained" : "outlined"}
          onPress={handleMarkAsListened}
          style={styles.actionButton}
          icon={currentAlbumIsListened ? "check" : "plus"}
          disabled={submitting || !user}
          loading={submitting}
        >
          {currentAlbumIsListened ? "Listened" : "Mark as Listened"}
        </Button>
      </View>

      {/* Rating Section */}
      <Card style={styles.ratingCard} elevation={2}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.ratingTitle}>
            Rate this Album
          </Text>
          <StarRating 
            rating={currentAlbumUserReview?.rating || 0} 
            onRatingChange={handleRating} 
            disabled={submitting || !user}
          />
          {currentAlbumUserReview && currentAlbumUserReview.rating > 0 && (
            <Text variant="bodyMedium" style={styles.ratingText}>
              You rated this {currentAlbumUserReview.rating} star{currentAlbumUserReview.rating !== 1 ? 's' : ''}
            </Text>
          )}
          {!user && (
            <Text variant="bodySmall" style={styles.loginPrompt}>
              Sign in to rate this album
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* Album Description */}
      {currentAlbum.description && (
        <Card style={styles.descriptionCard} elevation={1}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              About This Album
            </Text>
            <Text variant="bodyMedium" style={styles.description}>
              {currentAlbum.description}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Track Listing */}
      <Card style={styles.trackListCard} elevation={1}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Track Listing
          </Text>
          {currentAlbum.trackList.map((track, index) => (
            <View key={track.id}>
              <TrackListItem track={track} albumArtist={currentAlbum.artist} />
              {index < currentAlbum.trackList.length - 1 && <Divider style={styles.trackDivider} />}
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* Additional Info */}
      <Card style={styles.infoCard} elevation={1}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Album Information
          </Text>
          <View style={styles.infoRow}>
            <Text variant="bodyMedium" style={styles.infoLabel}>Release Date:</Text>
            <Text variant="bodyMedium">{new Date(currentAlbum.releaseDate).toLocaleDateString()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text variant="bodyMedium" style={styles.infoLabel}>Total Duration:</Text>
            <Text variant="bodyMedium">{AlbumService.formatDuration(totalDuration)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text variant="bodyMedium" style={styles.infoLabel}>Number of Tracks:</Text>
            <Text variant="bodyMedium">{currentAlbum.trackList.length}</Text>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    color: theme.colors.textSecondary,
  },
  header: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  albumCover: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: 12,
    marginBottom: spacing.lg,
    resizeMode: 'cover',
    ...shadows.large,
  },
  albumInfoContainer: {
    alignItems: 'center',
  },
  albumTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  artistName: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  albumMeta: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  genreChip: {
    marginBottom: spacing.sm,
  },
  actionsContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  actionButton: {
    marginBottom: spacing.sm,
  },
  ratingCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  ratingTitle: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  starContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  star: {
    fontSize: 32,
    marginHorizontal: spacing.xs,
  },
  starFilled: {
    color: theme.colors.primary,
  },
  starEmpty: {
    color: '#ccc',
  },
  starDisabled: {
    opacity: 0.5,
  },
  ratingText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
  loginPrompt: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  descriptionCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  trackListCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  infoCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  description: {
    lineHeight: 22,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  trackNumber: {
    width: 30,
    alignItems: 'center',
  },
  trackNumberText: {
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  trackInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  trackTitle: {
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  trackArtist: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  trackDuration: {
    color: theme.colors.textSecondary,
    fontWeight: '500',
    minWidth: 40,
    textAlign: 'right',
  },
  trackDivider: {
    marginVertical: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  infoLabel: {
    fontWeight: '500',
  },
  bottomPadding: {
    height: spacing.xl,
  },
});