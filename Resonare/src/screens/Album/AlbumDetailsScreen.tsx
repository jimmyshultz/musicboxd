import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  Dimensions,
  Platform,
  Modal,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  ActivityIndicator,
  Chip,
  Divider,
  useTheme,
  TextInput,
} from 'react-native-paper';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';

import { HomeStackParamList, SearchStackParamList, Track } from '../../types';
import { RootState } from '../../store';
import { HalfStarRating } from '../../components/HalfStarRating';
import Icon from 'react-native-vector-icons/FontAwesome';
import { 
  setCurrentAlbum, 
  clearCurrentAlbum, 
  setCurrentAlbumUserReview, 
  setCurrentAlbumIsListened
} from '../../store/slices/albumSlice';
import { AlbumService } from '../../services/albumService';
import { albumListensService } from '../../services/albumListensService';
import { albumRatingsService } from '../../services/albumRatingsService';
import { diaryEntriesService } from '../../services/diaryEntriesService';
import { spacing, shadows } from '../../utils/theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Portal, Dialog, Switch } from 'react-native-paper';

type AlbumDetailsRouteProp = RouteProp<HomeStackParamList | SearchStackParamList, 'AlbumDetails'>;

// Icon components to avoid creating them during render
const CheckIcon = (props: any) => <Icon name="check" size={16} color={props.color || '#666'} />;
const PlusIcon = (props: any) => <Icon name="plus" size={16} color={props.color || '#666'} />;

const { width } = Dimensions.get('window');
const COVER_SIZE = width * 0.6;



const TrackListItem = ({ track, theme }: { track: Track; albumArtist: string; theme: any }) => {
  const styles = createStyles(theme);
  return (
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
};

export default function AlbumDetailsScreen() {
  const route = useRoute<AlbumDetailsRouteProp>();
  const dispatch = useDispatch();
  const theme = useTheme();
  const { albumId } = route.params;
  
  const { currentAlbum, currentAlbumUserReview, currentAlbumIsListened } = useSelector((state: RootState) => state.albums);
  const { user } = useSelector((state: RootState) => state.auth);
  const { interactions, loading: userAlbumsLoading } = useSelector((state: RootState) => state.userAlbums);
  
  // Get current album interaction from the new database-backed state
  const currentAlbumInteraction = interactions[albumId];
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDiaryModal, setShowDiaryModal] = useState(false);
  const [addToDiary, setAddToDiary] = useState(true);
  const [diaryDate, setDiaryDate] = useState<Date>(new Date());
  const [diaryRating, setDiaryRating] = useState<number | undefined>(undefined);
  const [diaryReview, setDiaryReview] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const openDiaryModal = () => {
    setAddToDiary(true);
    setDiaryDate(new Date());
    setDiaryRating(undefined);
    setDiaryReview('');
    setShowDiaryModal(true);
  };

  const handleConfirmDiaryModal = async () => {
    if (!user || !currentAlbum) return;
    setSubmitting(true);
    try {
      if (addToDiary) {
        const iso = `${diaryDate.getFullYear()}-${String(diaryDate.getMonth()+1).padStart(2,'0')}-${String(diaryDate.getDate()).padStart(2,'0')}`;
        const reviewText = diaryReview.trim() || undefined;
        const res = await diaryEntriesService.createDiaryEntry(user.id, currentAlbum.id, iso, diaryRating, reviewText);
        if (!res.success) {
          console.warn(res.message);
        } else {
          // If user has not rated the album yet and provided a diary rating, set the overall album rating now
          if (typeof diaryRating === 'number' && diaryRating > 0 && (!currentAlbumUserReview || currentAlbumUserReview.rating <= 0)) {
            try {
              await albumRatingsService.rateAlbum(user.id, currentAlbum.id, diaryRating);
              const newReview = {
                id: `review_${currentAlbum.id}_${user.id}`,
                userId: user.id,
                albumId: currentAlbum.id,
                rating: diaryRating,
                reviewText: '',
                dateReviewed: new Date().toISOString(),
                likesCount: 0,
                commentsCount: 0,
              };
              dispatch(setCurrentAlbumUserReview(newReview));
            } catch (e) {
              console.error('Error applying diary rating to album rating:', e);
            }
          }
          // Reload details so UI reflects any rating changes
          await loadAlbumDetails();
        }
      }
    } catch (e) {
      console.error('Error creating diary entry', e);
    } finally {
      setShowDiaryModal(false);
      setSubmitting(false);
      setDiaryReview('');
    }
  };

  const handleMarkAsListened = async () => {
    if (!user || !currentAlbum || submitting) return;
    setSubmitting(true);
    try {
      const isCurrentlyListened = currentAlbumIsListened;
      
      if (isCurrentlyListened) {
        // Remove listen using new service
        await albumListensService.unmarkAsListened(user.id, currentAlbum.id);
        dispatch(setCurrentAlbumIsListened(false));
      } else {
        // Add listen using new service
        await albumListensService.markAsListened(user.id, currentAlbum.id);
        dispatch(setCurrentAlbumIsListened(true));
        openDiaryModal();
      }
    } catch (error) {
      console.error('Error updating listen status:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddDiaryOnly = () => {
    if (!user || !currentAlbum) return;
    openDiaryModal();
  };

  const loadAlbumDetails = useCallback(async () => {
    setLoading(true);
    try {
      const response = await AlbumService.getAlbumById(albumId);
      if (response.success && response.data) {
        dispatch(setCurrentAlbum(response.data));
        
        // Load user's interactions if user is logged in
        if (user) {
          try {
            // Check if user has listened to this album
            const hasListened = await albumListensService.hasUserListenedToAlbum(user.id, albumId);
            dispatch(setCurrentAlbumIsListened(hasListened));
            
            // Get user's rating for this album
            const userRating = await albumRatingsService.getUserAlbumRating(user.id, albumId);
            if (userRating) {
              const reviewData = {
                id: `review_${albumId}_${user.id}`,
                userId: user.id,
                albumId: albumId,
                rating: userRating.rating,
                reviewText: userRating.review || '',
                dateReviewed: userRating.updated_at,
                likesCount: 0,
                commentsCount: 0,
              };
              dispatch(setCurrentAlbumUserReview(reviewData));
            }
          } catch (error) {
            console.error('Error loading user album interactions:', error);
          }
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAlbumDetails();
    } finally {
      setRefreshing(false);
    }
  }, [loadAlbumDetails]);

  const handleRating = async (rating: number) => {
    if (!user || !currentAlbum || submitting) return;
    
    setSubmitting(true);
    try {
      if (rating === 0) {
        // Remove rating using new service
        await albumRatingsService.removeRating(user.id, currentAlbum.id);
        dispatch(setCurrentAlbumUserReview(null));
      } else {
        // Add or update rating using new service
        await albumRatingsService.rateAlbum(user.id, currentAlbum.id, rating);
        
        // Update local review state for immediate UI feedback
        const newReview = {
          id: `review_${currentAlbum.id}_${user.id}`,
          userId: user.id,
          albumId: currentAlbum.id,
          rating,
          reviewText: '',
          dateReviewed: new Date().toISOString(),
          likesCount: 0,
          commentsCount: 0,
        };
        dispatch(setCurrentAlbumUserReview(newReview));
      }
    } catch (error) {
      console.error('Error saving rating:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !currentAlbum) {
    const styles = createStyles(theme);
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
  const styles = createStyles(theme);

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
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
          icon={currentAlbumIsListened ? CheckIcon : PlusIcon}
          disabled={submitting || !user || userAlbumsLoading.markAsListened}
          loading={submitting || userAlbumsLoading.markAsListened}
        >
          {currentAlbumIsListened ? "Listened" : "Mark as Listened"}
        </Button>
        {currentAlbumIsListened && (
          <Button
            mode="outlined"
            onPress={handleAddDiaryOnly}
            style={styles.actionButton}
            disabled={submitting || !user}
          >
            Add to Diary
          </Button>
        )}
      </View>

      {/* Rating Section */}
      <Card style={styles.ratingCard} elevation={2}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.ratingTitle}>
            Rate this Album
          </Text>
          <View style={styles.starContainer}>
            <HalfStarRating 
              rating={currentAlbumInteraction?.rating || currentAlbumUserReview?.rating || 0} 
              onRatingChange={handleRating} 
              disabled={submitting || !user || userAlbumsLoading.rating}
              size="large"
            />
          </View>
          {(currentAlbumInteraction?.rating || currentAlbumUserReview?.rating) && (
            <Text variant="bodyMedium" style={styles.ratingText}>
              You rated this {(currentAlbumInteraction?.rating || currentAlbumUserReview?.rating)?.toFixed(1)} star{(currentAlbumInteraction?.rating || currentAlbumUserReview?.rating) !== 1 ? 's' : ''}
            </Text>
          )}
          {!user && (
            <Text variant="bodySmall" style={styles.loginPrompt}>
              Sign in to rate this album
            </Text>
          )}
          {userAlbumsLoading.rating && (
            <Text variant="bodySmall" style={styles.loadingText}>
              Updating rating...
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
              <TrackListItem track={track} albumArtist={currentAlbum.artist} theme={theme} />
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

      <Portal>
        <Dialog visible={showDiaryModal} onDismiss={() => setShowDiaryModal(false)}>
          <Dialog.Title>Add to Diary</Dialog.Title>
          <Dialog.Content>
            <View style={styles.diaryToggleRow}>
              <Text>Add to diary?</Text>
              <Switch value={addToDiary} onValueChange={setAddToDiary} />
            </View>
            <View style={styles.diaryDateContainer}>
              <Text variant="bodyMedium" style={{ marginBottom: spacing.xs }}>Date</Text>
              <Button mode="outlined" onPress={() => setShowDatePicker(true)}>
                {diaryDate.toLocaleDateString()}
              </Button>
            </View>
            <View style={styles.diaryRatingContainer}>
              <Text variant="bodyMedium" style={{ marginBottom: spacing.xs }}>Optional rating</Text>
              <HalfStarRating rating={diaryRating || 0} onRatingChange={(r) => setDiaryRating(r || undefined)} />
            </View>
            <View style={styles.diaryReviewContainer}>
              <Text variant="bodyMedium" style={{ marginBottom: spacing.xs }}>Review (optional)</Text>
              <TextInput
                mode="outlined"
                placeholder="Share your thoughts about this album..."
                value={diaryReview}
                onChangeText={(text) => {
                  if (text.length <= 280) {
                    setDiaryReview(text);
                  }
                }}
                multiline
                numberOfLines={3}
                maxLength={280}
                style={styles.diaryReviewInput}
              />
              <Text variant="bodySmall" style={styles.characterCount}>
                {diaryReview.length}/280
              </Text>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDiaryModal(false)}>Cancel</Button>
            <Button onPress={handleConfirmDiaryModal}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Platform native date picker modal to avoid Dialog portal conflicts */}
      {showDatePicker && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}
               presentationStyle="overFullScreen"
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Button onPress={() => setShowDatePicker(false)}>Cancel</Button>
                <Button onPress={() => setShowDatePicker(false)}>Done</Button>
              </View>
              <DateTimePicker
                value={diaryDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                themeVariant={Platform.OS === 'ios' ? 'light' : undefined}
                maximumDate={new Date()}
                onChange={(_: any, selected?: Date) => {
                  if (selected) setDiaryDate(selected);
                }}
              />
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
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
    color: theme.colors.onSurfaceVariant,
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
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  albumMeta: {
    color: theme.colors.onSurfaceVariant,
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
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  ratingText: {
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
  },
  loginPrompt: {
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
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
    color: theme.colors.onSurfaceVariant,
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
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
  },
  trackDuration: {
    color: theme.colors.onSurfaceVariant,
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
  diaryToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  diaryDateContainer: {
    marginBottom: spacing.md,
  },
  diaryRatingContainer: {
    alignItems: 'center',
  },
  diaryReviewContainer: {
    marginTop: spacing.md,
  },
  diaryReviewInput: {
    minHeight: 80,
  },
  characterCount: {
    textAlign: 'right',
    marginTop: spacing.xs,
    color: theme.colors.onSurfaceVariant,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: theme.colors.surface,
    paddingBottom: spacing.lg,
    width: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
});