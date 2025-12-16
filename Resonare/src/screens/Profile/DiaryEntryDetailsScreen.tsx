import React, { useCallback, useEffect, useState, useLayoutEffect, useMemo } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, FlatList } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Button, Text, ActivityIndicator, Menu, IconButton, useTheme, TextInput, Avatar, Divider } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { captureRef } from 'react-native-view-shot';
import Share from 'react-native-share';
import Icon from 'react-native-vector-icons/FontAwesome';

import { DiaryEntry, ProfileStackParamList, HomeStackParamList, SearchStackParamList, Album } from '../../types';
import { DiaryEntryComment } from '../../types/database';
import { diaryEntriesService } from '../../services/diaryEntriesService';
import { HalfStarRating, HalfStarDisplay } from '../../components/HalfStarRating';
import { AlbumService } from '../../services/albumService';
import { useDispatch, useSelector } from 'react-redux';
import { removeDiaryEntry, upsertDiaryEntry } from '../../store/slices/diarySlice';
import {
  loadDiaryEntrySocialInfo,
  toggleDiaryEntryLike,
  loadDiaryEntryComments,
  createDiaryEntryComment,
  deleteDiaryEntryComment,
  updateSocialInfoFromEntry,
} from '../../store/slices/diarySocialSlice';
import { RootState, AppDispatch } from '../../store';
import { spacing } from '../../utils/theme';
import { contentModerationService } from '../../services/contentModerationService';

 type DetailsRoute = RouteProp<ProfileStackParamList | HomeStackParamList | SearchStackParamList, 'DiaryEntryDetails'>;
 type DetailsNav = StackNavigationProp<ProfileStackParamList | HomeStackParamList | SearchStackParamList>;

// Menu icon component to avoid creating during render
const MenuIcon = () => <Icon name="ellipsis-v" size={18} color="#666" />;



 export default function DiaryEntryDetailsScreen() {
  const route = useRoute<DetailsRoute>();
  const navigation = useNavigation<DetailsNav>();
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { entryId, userId } = route.params;
  const { user: currentUser } = useSelector((s: RootState) => s.auth);

  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date | null>(null);
  const [_sharing, setSharing] = useState(false);
  const [showShareView, setShowShareView] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [editingReview, setEditingReview] = useState(false);
  const [pendingReview, setPendingReview] = useState<string>('');
  const [commentText, setCommentText] = useState<string>('');
  const shareViewRef = React.useRef<View>(null);

  // Get social state from Redux
  const likeState = useSelector((s: RootState) => s.diarySocial.likesByEntryId[entryId]);
  const commentsState = useSelector((s: RootState) => s.diarySocial.commentsByEntryId[entryId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const e = await diaryEntriesService.getDiaryEntryById(entryId, currentUser?.id);
      if (e) {
        // Convert from new service format to old DiaryEntry format for compatibility
        const convertedEntry: DiaryEntry = {
          id: e.id,
          userId: e.user_id,
          albumId: e.album_id,
          diaryDate: e.diary_date,
          ratingAtTime: e.rating || undefined,
          review: e.notes || undefined,
          createdAt: e.created_at,
          updatedAt: e.updated_at,
          likesCount: e.likes_count,
          commentsCount: e.comments_count,
        };
        
        setEntry(convertedEntry);
        
        // Update social info in Redux
        dispatch(updateSocialInfoFromEntry({
          entryId,
          likesCount: e.likes_count,
          commentsCount: e.comments_count,
        }));
        
        // Only load social info and comments if there's a review
        if (e.notes) {
          // Load social info (including hasLiked) - this won't disable the button
          dispatch(loadDiaryEntrySocialInfo({ entryId, userId: currentUser?.id }));
          // Load comments
          dispatch(loadDiaryEntryComments({ entryId, reset: true }));
        }
        
        // Get album details
        const res = await AlbumService.getAlbumById(e.album_id);
        if (res.success && res.data) {
          setAlbum(res.data);
        }
      }
    } catch (error) {
      console.error('Error loading diary entry:', error);
    }
    setLoading(false);
  }, [entryId, currentUser?.id, dispatch]);

  useEffect(() => { load(); }, [load]);

  const canEdit = entry && currentUser?.id === userId;

  const handleShareDiaryEntry = useCallback(async () => {
    if (!album || !entry) return;
    
    setSharing(true);
    setShowShareView(true);
    
    try {
      // Wait for the view to render
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const shareView = shareViewRef.current;
      if (!shareView) {
        throw new Error('Share view not found');
      }
      
      console.log('Capturing view...');
      // Capture the view
      const uri = await captureRef(shareView, {
        format: 'png',
        quality: 1.0,
      });
      
      console.log('View captured, URI:', uri);

      // Try general sharing first (more reliable than Instagram-specific)
      const shareOptions = {
        url: `file://${uri}`,
        type: 'image/png',
        title: 'Share Diary Entry',
        message: `Check out my diary entry for ${album.title} by ${album.artist}!`,
      };

      console.log('Opening share dialog...');
      const result = await Share.open(shareOptions);
      console.log('Share dialog result:', result);
      
    } catch (error) {
      console.log('Share cancelled or failed:', error);
      
      // Only show error alert for actual errors, not user cancellation
      if (error.message !== 'User did not share') {
        Alert.alert('Share Error', 'Unable to share at this time. Please try again later.');
      }
    }
    
    setShowShareView(false);
    setSharing(false);
  }, [album, entry]);

  const onDelete = useCallback(async () => {
    if (!entry) return;
    setSaving(true);
    try {
      const res = await diaryEntriesService.deleteDiaryEntry(entry.id);
      if (res.success) {
        dispatch(removeDiaryEntry({ userId, entryId: entry.id }));
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error deleting diary entry:', error);
    }
    setSaving(false);
  }, [entry, navigation, dispatch, userId]);

  // Set up header menu - only show if user can edit
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: canEdit ? () => (
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <IconButton
              icon={MenuIcon}
              onPress={() => setMenuVisible(true)}
            />
          }
        >
          <Menu.Item 
            onPress={() => {
              setMenuVisible(false);
              handleShareDiaryEntry();
            }} 
            title="Share" 
            leadingIcon="share" 
          />
          <Menu.Item 
            onPress={() => {
              setMenuVisible(false);
              setShowPicker(true);
            }} 
            title="Edit Date" 
            leadingIcon="calendar" 
          />
          <Menu.Item 
            onPress={() => {
              setMenuVisible(false);
              handleEditReview();
            }} 
            title="Edit Review" 
            leadingIcon="pencil" 
          />
          <Menu.Item 
            onPress={() => {
              setMenuVisible(false);
              onDelete();
            }} 
            title="Delete" 
            leadingIcon="delete" 
          />
        </Menu>
      ) : undefined,
    });
  }, [navigation, menuVisible, canEdit, handleShareDiaryEntry, onDelete, handleEditReview]);

  const onChangeDate = (_: any, selected?: Date) => {
    if (selected) {
      setPendingDate(selected);
    }
  };

  const handleSaveDate = async () => {
    if (!entry || !pendingDate) return;
    setSaving(true);
    try {
      const iso = `${pendingDate.getFullYear()}-${String(pendingDate.getMonth()+1).padStart(2,'0')}-${String(pendingDate.getDate()).padStart(2,'0')}`;
      const res = await diaryEntriesService.updateDiaryEntry(entry.id, { diaryDate: iso });
      if (res.success && res.entry) {
        // Convert from new service format to old DiaryEntry format
        const convertedEntry: DiaryEntry = {
          id: res.entry.id,
          userId: res.entry.user_id,
          albumId: res.entry.album_id,
          diaryDate: res.entry.diary_date,
          ratingAtTime: res.entry.rating || undefined,
          createdAt: res.entry.created_at,
          updatedAt: res.entry.updated_at,
        };
        setEntry(convertedEntry);
        dispatch(upsertDiaryEntry(convertedEntry));
      }
    } catch (error) {
      console.error('Error updating diary date:', error);
    }
    setSaving(false);
    setShowPicker(false);
    setPendingDate(null);
  };

  const handleCancelDate = () => {
    setShowPicker(false);
    setPendingDate(null);
  };

  const onChangeRating = async (newRating: number) => {
    if (!entry) return;
    setSaving(true);
    try {
      const res = await diaryEntriesService.updateDiaryEntry(entry.id, { rating: newRating });
      if (res.success && res.entry) {
        // Convert from new service format to old DiaryEntry format
        const convertedEntry: DiaryEntry = {
          id: res.entry.id,
          userId: res.entry.user_id,
          albumId: res.entry.album_id,
          diaryDate: res.entry.diary_date,
          ratingAtTime: res.entry.rating || undefined,
          review: res.entry.notes || undefined,
          createdAt: res.entry.created_at,
          updatedAt: res.entry.updated_at,
        };
        setEntry(convertedEntry);
        dispatch(upsertDiaryEntry(convertedEntry));
      }
    } catch (error) {
      console.error('Error updating diary rating:', error);
    }
    setSaving(false);
  };

  const handleEditReview = useCallback(() => {
    setPendingReview(entry?.review || '');
    setEditingReview(true);
  }, [entry?.review]);

  const handleCancelReview = useCallback(() => {
    setEditingReview(false);
    setPendingReview('');
  }, []);

  const handleSaveReview = useCallback(async () => {
    if (!entry) return;
    setSaving(true);
    try {
      // Allow empty reviews - trim and explicitly set to null if empty to clear the database field
      const reviewText = pendingReview.trim();
      const res = await diaryEntriesService.updateDiaryEntry(entry.id, { 
        notes: reviewText.length > 0 ? reviewText : null as any
      });
      if (res.success && res.entry) {
        // Convert from new service format to old DiaryEntry format
        const convertedEntry: DiaryEntry = {
          id: res.entry.id,
          userId: res.entry.user_id,
          albumId: res.entry.album_id,
          diaryDate: res.entry.diary_date,
          ratingAtTime: res.entry.rating || undefined,
          review: res.entry.notes || undefined,
          createdAt: res.entry.created_at,
          updatedAt: res.entry.updated_at,
          likesCount: res.entry.likes_count,
          commentsCount: res.entry.comments_count,
        };
        setEntry(convertedEntry);
        dispatch(upsertDiaryEntry(convertedEntry));
      }
    } catch (error) {
      console.error('Error updating diary review:', error);
    }
    setSaving(false);
    setEditingReview(false);
    setPendingReview('');
  }, [entry, dispatch, pendingReview]);

  const handleToggleLike = useCallback(async () => {
    if (!currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to like diary entries');
      return;
    }
    if (likeState?.loading) {
      console.log('Like action already in progress, ignoring click');
      return;
    }
    try {
      // Get current like state before toggling
      const currentHasLiked = likeState?.hasLiked || false;
      const currentLikesCount = likeState?.likesCount ?? entry?.likesCount ?? 0;
      console.log('Toggling like for entry:', entryId, 'user:', currentUser.id, 'currentlyLiked:', currentHasLiked, 'currentCount:', currentLikesCount, 'likeState:', likeState);
      const result = await dispatch(toggleDiaryEntryLike({ 
        entryId, 
        userId: currentUser.id,
        currentHasLiked 
      })).unwrap();
      console.log('Like toggle result:', result);
      // Don't reload immediately - the optimistic update is correct and the database trigger
      // will update the count. The count will be accurate on next page load or when
      // the entry is refreshed naturally.
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to like diary entry');
    }
  }, [currentUser, entryId, dispatch, likeState, entry?.likesCount]);

  const handlePostComment = useCallback(async () => {
    if (!currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to comment on diary entries');
      return;
    }
    if (!commentText.trim()) {
      return;
    }

    // Validate comment content before submitting
    const commentValidation = contentModerationService.validateComment(commentText.trim());
    if (!commentValidation.isValid) {
      Alert.alert('Content Issue', commentValidation.error || 'Your comment contains inappropriate content. Please revise it.');
      return;
    }

    try {
      await dispatch(createDiaryEntryComment({ entryId, userId: currentUser.id, body: commentText.trim() })).unwrap();
      setCommentText('');
      // Reload social info to update comments count
      dispatch(loadDiaryEntrySocialInfo({ entryId, userId: currentUser.id }));
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to post comment');
    }
  }, [currentUser, entryId, commentText, dispatch]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!currentUser) return;
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteDiaryEntryComment({ commentId, entryId, userId: currentUser.id })).unwrap();
              // Reload social info to update comments count
              dispatch(loadDiaryEntrySocialInfo({ entryId, userId: currentUser.id }));
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete comment');
            }
          },
        },
      ]
    );
  }, [currentUser, entryId, dispatch]);

  const formatTimeAgo = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }, []);

  // Create styles early so they're available in callbacks
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Comment separator component - defined outside render to avoid recreation
  const CommentSeparator = useMemo(() => {
    return () => <View style={styles.commentSeparator} />;
  }, [styles.commentSeparator]);

  const renderComment = useCallback(({ item }: { item: DiaryEntryComment }) => {
    // Convert database comment format to app format
    const commentUserId = 'user_id' in item ? item.user_id : item.userId;
    const commentId = item.id;
    const commentBody = 'body' in item ? item.body : item.body;
    const commentCreatedAt = 'created_at' in item ? item.created_at : item.createdAt;
    const commentUser = 'user_profile' in item && item.user_profile ? {
      id: item.user_profile.id,
      username: item.user_profile.username,
      avatarUrl: item.user_profile.avatar_url,
    } : ('user' in item ? item.user : undefined);

    const canDelete = currentUser && (currentUser.id === commentUserId || currentUser.id === userId);
    return (
      <View style={styles.commentItem}>
        <Avatar.Image
          size={32}
          source={{ uri: commentUser?.avatarUrl || 'https://via.placeholder.com/32x32/cccccc/999999?text=U' }}
        />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text variant="bodyMedium" style={styles.commentUsername}>
              {commentUser?.username || 'Unknown'}
            </Text>
            <Text variant="bodySmall" style={styles.commentTime}>
              {formatTimeAgo(commentCreatedAt)}
            </Text>
          </View>
          <Text variant="bodyMedium" style={styles.commentBody}>
            {commentBody}
          </Text>
        </View>
        {canDelete && (
          <IconButton
            icon="delete-outline"
            size={18}
            onPress={() => handleDeleteComment(commentId)}
            style={styles.commentDeleteButton}
          />
        )}
      </View>
    );
  }, [currentUser, userId, formatTimeAgo, handleDeleteComment, styles]);

  if (loading || !entry) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator />
        <Text style={{ marginTop: spacing.sm }}>Loading diary entry…</Text>
      </View>
    );
  }

  const d = new Date(entry.diaryDate + 'T00:00:00');
  const albumYear = album ? new Date(album.releaseDate).getFullYear() : undefined;

  return (
    <KeyboardAvoidingView 
      style={styles.keyboardAvoidingView} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.contentContainer}>
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={[
            styles.scrollContent, 
            editingReview && styles.scrollContentWithKeyboard,
            currentUser && styles.scrollContentWithFixedInput // Add bottom padding when input is fixed
          ]}
          keyboardShouldPersistTaps="handled"
        >
        {/* Shareable view for Instagram - only rendered when needed */}
        {showShareView && (
        <View ref={shareViewRef} style={styles.shareView}>
          {album && (
            <View style={styles.shareContent}>
              <Image source={{ uri: album.coverImageUrl }} style={styles.shareAlbumCover} />
              <View style={styles.shareTextOverlay}>
                <Text style={styles.shareAlbumTitle}>{album.title}</Text>
                <Text style={styles.shareArtistName}>{album.artist}</Text>
                <Text style={styles.shareDate}>{d.toLocaleDateString()}</Text>
                {entry.ratingAtTime && (
                  <View style={styles.shareRatingContainer}>
                    <HalfStarDisplay rating={entry.ratingAtTime} size="large" />
                    <Text style={styles.shareRatingText}>{entry.ratingAtTime.toFixed(1)} stars</Text>
                  </View>
                )}
                {entry.review && (
                  <Text style={styles.shareNotes}>"{entry.review}"</Text>
                )}
                <Text style={styles.shareAppName}>Resonare</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Regular diary entry view */}
      {album && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.navigate('AlbumDetails', { albumId: album.id })}>
            <Image source={{ uri: album.coverImageUrl }} style={styles.cover} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text variant="titleLarge">{album.title} {albumYear ? `(${albumYear})` : ''}</Text>
            <Text variant="bodyMedium" style={styles.subduedText}>{album.artist}</Text>
          </View>
        </View>
      )}

      <View style={styles.row}>
        <Text variant="bodyLarge">Diary date</Text>
        <Text variant="bodyLarge">{d.toLocaleDateString()}</Text>
      </View>

      <View style={[styles.row, styles.rowAlignCenter] }>
        <Text variant="bodyLarge">Rating</Text>
        <View style={styles.rowDirection}>
          {canEdit ? (
            <HalfStarRating
              rating={entry.ratingAtTime || 0}
              onRatingChange={onChangeRating}
              size="medium"
            />
          ) : (
            <HalfStarDisplay
              rating={entry.ratingAtTime || 0}
              size="medium"
            />
          )}
        </View>
      </View>

      {/* Review Section - Only show if there's a review or user can edit */}
      {(entry.review || canEdit) && (
        <View style={styles.reviewSection}>
          <Text variant="titleMedium" style={styles.reviewTitle}>Review</Text>
          {editingReview && canEdit ? (
            <View style={styles.reviewEditContainer}>
              <TextInput
                mode="outlined"
                placeholder="Share your thoughts about this album..."
                value={pendingReview}
                onChangeText={(text) => {
                  if (text.length <= 280) {
                    setPendingReview(text);
                  }
                }}
                multiline
                numberOfLines={4}
                maxLength={280}
                style={styles.reviewInput}
              />
              <Text variant="bodySmall" style={styles.characterCount}>
                {pendingReview.length}/280
              </Text>
              <View style={styles.reviewButtons}>
                <Button mode="outlined" onPress={handleCancelReview} disabled={saving}>
                  Cancel
                </Button>
                <Button mode="contained" onPress={handleSaveReview} disabled={saving}>
                  Save
                </Button>
              </View>
            </View>
          ) : (
            <View>
              {entry.review ? (
                <Text variant="bodyMedium" style={styles.reviewText}>
                  {entry.review}
                </Text>
              ) : (
                <Text variant="bodyMedium" style={styles.noReviewText}>
                  Tap "Edit Review" to add your thoughts
                </Text>
              )}
            </View>
          )}
        </View>
      )}

      {/* Social Interactions Section - Only show if there's a review */}
      {entry.review && (
        <View style={styles.socialSection}>
        {/* Like Button */}
        <View style={styles.likeSection}>
          <TouchableOpacity
            onPress={handleToggleLike}
            disabled={!currentUser || (likeState?.loading === true)}
            style={[styles.likeButton, (!currentUser || likeState?.loading === true) && styles.likeButtonDisabled]}
          >
            <Icon
              name={likeState?.hasLiked ? 'heart' : 'heart-o'}
              size={24}
              color={likeState?.hasLiked ? theme.colors.error : theme.colors.onSurfaceVariant}
            />
            <Text variant="bodyMedium" style={[
              styles.likeCount,
              likeState?.hasLiked && styles.likedText
            ]}>
              {likeState?.likesCount ?? entry?.likesCount ?? 0}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Divider between likes and comments */}
        <Divider style={styles.commentsDivider} />

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text variant="titleMedium" style={styles.commentsTitle}>
            Comments ({commentsState?.comments.length ?? entry?.commentsCount ?? 0})
          </Text>

          {/* Comments List */}
          {commentsState?.loading && commentsState.comments.length === 0 ? (
            <View style={styles.loadingComments}>
              <ActivityIndicator size="small" />
            </View>
          ) : commentsState?.comments && commentsState.comments.length > 0 ? (
            <FlatList
              data={commentsState.comments}
              renderItem={renderComment}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={CommentSeparator}
              contentContainerStyle={styles.commentsListContent}
            />
          ) : null}
        </View>
      </View>
      )}

        {showPicker && (
          <View style={styles.datePickerContainer}>
            <DateTimePicker
              value={pendingDate || d}
              mode="date"
              display="spinner"
              maximumDate={new Date()}
              onChange={onChangeDate}
            />
            <View style={styles.datePickerButtons}>
              <Button mode="outlined" onPress={handleCancelDate} disabled={saving}>
                Cancel
              </Button>
              <Button mode="contained" onPress={handleSaveDate} disabled={saving || !pendingDate}>
                Save
              </Button>
            </View>
          </View>
        )}
        </ScrollView>

        {/* Fixed Comment Input at Bottom of Viewport - Only show if there's a review */}
        {currentUser && entry.review && (
          <View style={styles.fixedCommentInputContainer}>
            <TextInput
              mode="outlined"
              placeholder="Add a comment..."
              value={commentText}
              onChangeText={(text) => {
                if (text.length <= 2000) {
                  setCommentText(text);
                }
              }}
              multiline
              maxLength={280}
              style={styles.commentInput}
              right={
                <TextInput.Icon
                  icon="send"
                  onPress={handlePostComment}
                  disabled={!commentText.trim()}
                />
              }
            />
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

 const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { 
    padding: spacing.lg,
    paddingBottom: spacing.xl, // Extra padding at bottom for date picker
  },
  scrollContentWithKeyboard: {
    paddingBottom: 300, // Extra padding when keyboard is visible to allow scrolling past keyboard
  },
  scrollContentWithFixedInput: {
    paddingBottom: 100, // Extra padding at bottom when comment input is fixed (to prevent content from being hidden)
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', marginBottom: spacing.lg },
  datePickerContainer: { 
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
  },
  datePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
    gap: spacing.sm,
  },

  shareView: {
    position: 'absolute',
    top: 0,
    left: -1080, // Position off-screen to the left instead of overlaying
    width: 1080,
    height: 1920,
    zIndex: 1000,
  },
  shareContent: {
    flex: 1,
    backgroundColor: '#1a1a1a', // Dark background for Instagram story
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
  },
  shareAlbumCover: {
    width: 300,
    height: 300,
    borderRadius: 16,
    marginBottom: 40,
  },
  shareTextOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 30,
    borderRadius: 20,
    maxWidth: 400,
  },
  shareAlbumTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  shareArtistName: {
    fontSize: 22,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 16,
  },
  shareDate: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  shareRatingContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  shareRatingText: {
    fontSize: 16,
    color: '#fff',
    marginTop: 8,
  },
  shareNotes: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 20,
    lineHeight: 24,
  },
  shareAppName: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
  },
  cover: { width: 96, height: 96, borderRadius: 8 },
  headerTextContainer: { flex: 1, marginLeft: spacing.md },
  subduedText: { color: theme.colors.onSurfaceVariant },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.outline },
  rowAlignCenter: { alignItems: 'center' },
  rowDirection: { flexDirection: 'row' },
  reviewSection: {
    marginTop: spacing.md,
    paddingTop: 0,
    paddingBottom: spacing.md,
  },
  reviewTitle: {
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  reviewText: {
    lineHeight: 22,
    color: theme.colors.onSurface,
  },
  noReviewText: {
    lineHeight: 22,
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  reviewEditContainer: {
    marginTop: spacing.sm,
  },
  reviewInput: {
    minHeight: 100,
  },
  reviewButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  characterCount: {
    textAlign: 'right',
    marginTop: spacing.xs,
    color: theme.colors.onSurfaceVariant,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  socialSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  likeSection: {
    paddingBottom: spacing.md,
  },
  commentsDivider: {
    marginVertical: 0,
    backgroundColor: theme.colors.outline,
    height: 1,
  },
  commentsSection: {
    marginTop: 0,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  likeButtonDisabled: {
    opacity: 0.5,
  },
  likeCount: {
    color: theme.colors.onSurfaceVariant,
  },
  likedText: {
    color: theme.colors.error,
    fontWeight: '600',
  },
  commentsTitle: {
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  loadingComments: {
    padding: spacing.md,
    alignItems: 'center',
  },
  noCommentsText: {
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
    paddingVertical: spacing.md,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    alignItems: 'flex-start',
  },
  commentContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  commentUsername: {
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  commentTime: {
    color: theme.colors.onSurfaceVariant,
  },
  commentBody: {
    color: theme.colors.onSurface,
    lineHeight: 20,
  },
  commentDeleteButton: {
    margin: 0,
  },
  commentSeparator: {
    height: 1,
    backgroundColor: theme.colors.outlineVariant,
    marginVertical: spacing.sm,
  },
  commentInputContainer: {
    marginTop: spacing.md,
  },
  commentsListContent: {
    paddingBottom: spacing.xl, // Add padding so comments aren't hidden behind fixed input
  },
  fixedCommentInputContainer: {
    backgroundColor: theme.colors.surface,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outlineVariant,
    paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.md, // Extra padding for iOS safe area
    // Add elevation/shadow for better visibility
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  commentInput: {
    backgroundColor: theme.colors.surface,
  },
});