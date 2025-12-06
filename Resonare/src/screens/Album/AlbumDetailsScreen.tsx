import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  Dimensions,
  Platform,
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
  TouchableOpacity,
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
  Avatar,
} from 'react-native-paper';
import { RouteProp, useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useDispatch, useSelector } from 'react-redux';

import { HomeStackParamList, SearchStackParamList, ProfileStackParamList, Track } from '../../types';
import { RootState } from '../../store';
import { HalfStarRating } from '../../components/HalfStarRating';
import Icon from 'react-native-vector-icons/FontAwesome';
import { 
  setCurrentAlbum, 
  setCurrentAlbumUserReview, 
  setCurrentAlbumIsListened
} from '../../store/slices/albumSlice';
import { AlbumService } from '../../services/albumService';
import { albumListensService } from '../../services/albumListensService';
import { albumRatingsService } from '../../services/albumRatingsService';
import { diaryEntriesService, DiaryEntry, DiaryEntryWithUserProfile } from '../../services/diaryEntriesService';
import { spacing, shadows } from '../../utils/theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Switch } from 'react-native-paper';

type AlbumDetailsRouteProp = RouteProp<
  HomeStackParamList | SearchStackParamList | ProfileStackParamList,
  'AlbumDetails'
>;

type AlbumDetailsNavigationProp = StackNavigationProp<
  HomeStackParamList | SearchStackParamList | ProfileStackParamList,
  'AlbumDetails'
>;

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
  const navigation = useNavigation<AlbumDetailsNavigationProp>();
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
  const [userDiaryEntries, setUserDiaryEntries] = useState<DiaryEntry[]>([]);
  const [friendsDiaryEntries, setFriendsDiaryEntries] = useState<DiaryEntryWithUserProfile[]>([]);
  const [loadingInteractions, setLoadingInteractions] = useState(false);
  const [loadingDiaryEntries, setLoadingDiaryEntries] = useState(false);

  const openDiaryModal = () => {
    setAddToDiary(true);
    setDiaryDate(new Date());
    // Pre-fill rating from existing album rating if available
    const existingRating = currentAlbumInteraction?.rating || currentAlbumUserReview?.rating;
    setDiaryRating(existingRating || undefined);
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

          // Reload user's diary entries after successful creation
          if (res.success) {
            const userEntries = await diaryEntriesService.getUserDiaryEntriesForAlbum(user.id, currentAlbum.id);
            setUserDiaryEntries(userEntries);
          }
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

  const handleArtistPress = () => {
    if (!currentAlbum) return;

    // If we have artistId, navigate to artist details
    if (currentAlbum.artistId) {
      navigation.push('ArtistDetails', {
        artistId: currentAlbum.artistId,
        artistName: currentAlbum.artist,
      });
    }
    // If no artistId, could potentially search for artist by name
    // But for now, we'll just not navigate if artistId is missing
  };

  const loadAlbumDetails = useCallback(async () => {
    setLoading(true);
    try {
      const response = await AlbumService.getAlbumById(albumId);
      if (response.success && response.data) {
        dispatch(setCurrentAlbum(response.data));
        
        // Show album immediately, then load interactions in parallel
        setLoading(false);
        
        // Load user's interactions if user is logged in
        if (user) {
          setLoadingInteractions(true);
          
          try {
            // Load all user interactions in parallel for faster loading
            const [hasListened, userRating, userEntries] = await Promise.all([
              albumListensService.hasUserListenedToAlbum(user.id, albumId),
              albumRatingsService.getUserAlbumRating(user.id, albumId),
              diaryEntriesService.getUserDiaryEntriesForAlbum(user.id, albumId),
            ]);
            
            // Update listened status
            dispatch(setCurrentAlbumIsListened(hasListened));
            
            // Update user rating
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
            
            // Update user's diary entries
            setUserDiaryEntries(userEntries);
            
            setLoadingInteractions(false);
            
            // Load friends' diary entries in background (non-blocking)
            setLoadingDiaryEntries(true);
            diaryEntriesService.getFriendsDiaryEntriesForAlbum(user.id, albumId, 10)
              .then(friendsEntries => {
                setFriendsDiaryEntries(friendsEntries);
                setLoadingDiaryEntries(false);
              })
              .catch(error => {
                console.error('Error loading friends diary entries:', error);
                setLoadingDiaryEntries(false);
              });
              
          } catch (error) {
            console.error('Error loading user album interactions:', error);
            setLoadingInteractions(false);
            setLoadingDiaryEntries(false);
          }
        }
      }
    } catch (error) {
      console.error('Error loading album details:', error);
      setLoading(false);
    }
  }, [albumId, dispatch, user]);

  // Use useFocusEffect to reload when screen comes into focus
  // This ensures the correct album is loaded when navigating back
  useFocusEffect(
    useCallback(() => {
      loadAlbumDetails();
    }, [loadAlbumDetails])
  );

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

  // Show loading if we're fetching data OR if the currentAlbum doesn't match the requested albumId
  // This prevents showing the wrong album data when navigating between albums
  if (loading || !currentAlbum || currentAlbum.id !== albumId) {
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
          <TouchableOpacity
            onPress={handleArtistPress}
            disabled={!currentAlbum.artistId}
            activeOpacity={currentAlbum.artistId ? 0.7 : 1}
          >
            <Text
              variant="titleLarge"
              style={[
                styles.artistName,
                currentAlbum.artistId && styles.artistNameClickable,
              ]}
            >
              {currentAlbum.artist}
            </Text>
          </TouchableOpacity>
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

      {/* Your Diary Entries */}
      {user && (loadingInteractions || userDiaryEntries.length > 0) && (
        <Card style={styles.diaryEntriesCard} elevation={1}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Your Diary Entries
            </Text>
            {loadingInteractions ? (
              <View style={styles.loadingSection}>
                <ActivityIndicator size="small" />
              </View>
            ) : (
              <>
                {userDiaryEntries.slice(0, 1).map((entry) => (
                  <TouchableOpacity
                    key={entry.id}
                    onPress={() => navigation.navigate('DiaryEntryDetails', { entryId: entry.id, userId: user.id })}
                    style={styles.diaryEntryItem}
                  >
                    <View style={styles.diaryEntryContent}>
                      <View style={styles.diaryEntryHeader}>
                        <Text variant="bodyMedium" style={styles.diaryEntryDate}>
                          {new Date(entry.diary_date).toLocaleDateString()}
                        </Text>
                        {entry.rating && (
                          <View style={styles.diaryEntryRating}>
                            <Icon name="star" size={14} color={theme.colors.primary} />
                            <Text variant="bodyMedium" style={styles.ratingValue}>
                              {entry.rating.toFixed(1)}
                            </Text>
                          </View>
                        )}
                      </View>
                      {entry.notes && (
                        <Text variant="bodySmall" numberOfLines={2} style={styles.diaryEntryNotes}>
                          {entry.notes}
                        </Text>
                      )}
                    </View>
                    <Icon name="chevron-right" size={16} color={theme.colors.onSurfaceVariant} />
                  </TouchableOpacity>
                ))}
                {userDiaryEntries.length > 1 && (
                  <Text variant="bodySmall" style={styles.moreEntriesText}>
                    You have {userDiaryEntries.length} {userDiaryEntries.length === 1 ? 'entry' : 'entries'} for this album
                  </Text>
                )}
              </>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Friends' Diary Entries */}
      {user && (loadingDiaryEntries || friendsDiaryEntries.length > 0) && (
        <Card style={styles.diaryEntriesCard} elevation={1}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Friends' Entries
            </Text>
            {loadingDiaryEntries && friendsDiaryEntries.length === 0 ? (
              <View style={styles.loadingSection}>
                <ActivityIndicator size="small" />
              </View>
            ) : (
              <>
                {friendsDiaryEntries.map((entry) => (
                  <TouchableOpacity
                    key={entry.id}
                    onPress={() => navigation.navigate('DiaryEntryDetails', { entryId: entry.id, userId: entry.user_id })}
                    style={styles.friendDiaryEntryItem}
                  >
                    <View style={styles.friendDiaryEntryContent}>
                      {entry.user_profiles?.avatar_url ? (
                        <Avatar.Image 
                          size={32} 
                          source={{ uri: entry.user_profiles.avatar_url }} 
                        />
                      ) : (
                        <Avatar.Icon 
                          size={32} 
                          icon="account" 
                        />
                      )}
                      <View style={styles.friendDiaryInfo}>
                        <Text variant="bodyMedium" style={styles.friendUsername}>
                          {entry.user_profiles?.username || 'Unknown'}
                        </Text>
                        <View style={styles.friendDiaryDateRatingRow}>
                          <Text variant="bodySmall" style={styles.friendDiaryDate}>
                            {new Date(entry.diary_date).toLocaleDateString()}
                          </Text>
                          {entry.rating && (
                            <View style={styles.friendDiaryRating}>
                              <Icon name="star" size={14} color={theme.colors.primary} />
                              <Text variant="bodyMedium" style={styles.ratingValue}>
                                {entry.rating.toFixed(1)}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                    <Icon name="chevron-right" size={16} color={theme.colors.onSurfaceVariant} />
                  </TouchableOpacity>
                ))}
              </>
            )}
          </Card.Content>
        </Card>
      )}

      <View style={styles.bottomPadding} />

      {/* Full-screen Diary Modal */}
      <Modal
        visible={showDiaryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDiaryModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={[styles.diaryModalContainer, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={[styles.diaryModalHeader, { borderBottomColor: theme.colors.outline }]}>
              <TouchableOpacity onPress={() => setShowDiaryModal(false)}>
                <Text variant="bodyLarge" style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
              <Text variant="titleLarge" style={styles.diaryModalTitle}>Add to Diary</Text>
              <TouchableOpacity onPress={handleConfirmDiaryModal} disabled={submitting}>
                <Text 
                  variant="bodyLarge" 
                  style={submitting ? styles.saveButtonDisabled : styles.saveButton}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>

            {/* Scrollable Content */}
            <ScrollView 
              style={styles.diaryModalScroll}
              contentContainerStyle={styles.diaryModalContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.diaryToggleRow}>
                <Text variant="bodyLarge">Add to diary?</Text>
                <Switch value={addToDiary} onValueChange={setAddToDiary} />
              </View>

              <View style={styles.diaryDateContainer}>
                <Text variant="bodyMedium" style={{ marginBottom: spacing.xs }}>Date</Text>
                {Platform.OS === 'ios' ? (
                  <>
                    <Button mode="outlined" onPress={() => setShowDatePicker(!showDatePicker)}>
                      {diaryDate.toLocaleDateString()}
                    </Button>
                    {showDatePicker && (
                      <View style={styles.datePickerContainer}>
                        <DateTimePicker
                          value={diaryDate}
                          mode="date"
                          display="spinner"
                          maximumDate={new Date()}
                          onChange={(_: any, selected?: Date) => {
                            if (selected) {
                              setDiaryDate(selected);
                            }
                          }}
                          style={styles.datePicker}
                        />
                      </View>
                    )}
                  </>
                ) : (
                  <Button mode="outlined" onPress={() => setShowDatePicker(true)}>
                    {diaryDate.toLocaleDateString()}
                  </Button>
                )}
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
                  numberOfLines={4}
                  maxLength={280}
                  style={styles.diaryReviewInput}
                />
                <Text variant="bodySmall" style={styles.characterCount}>
                  {diaryReview.length}/280
                </Text>
              </View>

              {/* Extra padding at bottom for keyboard */}
              <View style={styles.keyboardPaddingView} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Android native date picker dialog */}
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={diaryDate}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={(_: any, selected?: Date) => {
            setShowDatePicker(false);
            if (selected) {
              setDiaryDate(selected);
            }
          }}
        />
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
  artistNameClickable: {
    color: theme.colors.primary,
    textDecorationLine: 'underline',
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
  diaryModalContainer: {
    flex: 1,
  },
  diaryModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  diaryModalTitle: {
    fontWeight: '600',
  },
  diaryModalScroll: {
    flex: 1,
  },
  diaryModalContent: {
    padding: spacing.lg,
  },
  diaryToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  diaryDateContainer: {
    marginBottom: spacing.lg,
  },
  datePickerContainer: {
    marginTop: spacing.md,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 12,
    overflow: 'hidden',
  },
  datePicker: {
    width: '100%',
    height: 200,
  },
  diaryRatingContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  diaryReviewContainer: {
    marginTop: spacing.md,
  },
  diaryReviewInput: {
    minHeight: 100,
  },
  characterCount: {
    textAlign: 'right',
    marginTop: spacing.xs,
    color: theme.colors.onSurfaceVariant,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  cancelButton: {
    color: theme.colors.primary,
  },
  saveButton: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    color: theme.colors.onSurfaceDisabled,
    fontWeight: '600',
  },
  keyboardPaddingView: {
    height: 200,
  },
  diaryEntriesCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  loadingSection: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diaryEntryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  diaryEntryContent: {
    flex: 1,
  },
  diaryEntryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  diaryEntryDate: {
    fontWeight: '500',
  },
  diaryEntryRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingValue: {
    fontWeight: '500',
    color: theme.colors.primary,
  },
  diaryEntryNotes: {
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  moreEntriesText: {
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
  friendDiaryEntryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  friendDiaryEntryContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  friendDiaryInfo: {
    flex: 1,
  },
  friendUsername: {
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  friendDiaryDateRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  friendDiaryDate: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
  },
  friendDiaryRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});