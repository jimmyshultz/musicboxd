import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Button, Text, ActivityIndicator } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { captureRef } from 'react-native-view-shot';
import Share from 'react-native-share';
import Icon from 'react-native-vector-icons/FontAwesome';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';

import { DiaryEntry, ProfileStackParamList, HomeStackParamList, SearchStackParamList, Album } from '../../types';
import { diaryEntriesService } from '../../services/diaryEntriesService';
import { HalfStarRating, HalfStarDisplay } from '../../components/HalfStarRating';
import { AlbumService } from '../../services/albumService';
import { useDispatch, useSelector } from 'react-redux';
import { removeDiaryEntry, upsertDiaryEntry } from '../../store/slices/diarySlice';
import { RootState } from '../../store';
import { theme, spacing } from '../../utils/theme';

 type DetailsRoute = RouteProp<ProfileStackParamList | HomeStackParamList | SearchStackParamList, 'DiaryEntryDetails'>;
 type DetailsNav = StackNavigationProp<ProfileStackParamList | HomeStackParamList | SearchStackParamList>;



 export default function DiaryEntryDetailsScreen() {
  const route = useRoute<DetailsRoute>();
  const navigation = useNavigation<DetailsNav>();
  const dispatch = useDispatch();
  const { entryId, userId } = route.params;
  const { user: currentUser } = useSelector((s: RootState) => s.auth);

  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date | null>(null);
  const [sharing, setSharing] = useState(false);
  const [showShareView, setShowShareView] = useState(false);
  const shareViewRef = React.useRef<View>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const e = await diaryEntriesService.getDiaryEntryById(entryId);
      if (e) {
        // Convert from new service format to old DiaryEntry format for compatibility
        const convertedEntry: DiaryEntry = {
          id: e.id,
          userId: e.user_id,
          albumId: e.album_id,
          diaryDate: e.diary_date,
          ratingAtTime: e.rating || undefined,
          createdAt: e.created_at,
          updatedAt: e.updated_at,
        };
        
        setEntry(convertedEntry);
        
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
  }, [entryId]);

  useEffect(() => { load(); }, [load]);

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

  const handleShareDiaryEntry = async () => {
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
  };

  const handleSaveToPhotos = async () => {
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
      
      console.log('Capturing view for photo save...');
      // Capture the view
      const uri = await captureRef(shareView, {
        format: 'png',
        quality: 1.0,
      });
      
      console.log('View captured, saving to photos...');
      
      // Save directly to camera roll
      await CameraRoll.save(uri, { type: 'photo' });
      
      console.log('Image saved to photos successfully');
      Alert.alert('Success', 'Diary entry saved to Photos!');
      
    } catch (error) {
      console.log('Save to photos failed:', error);
      
      // Show user-friendly error message
      Alert.alert('Save Error', 'Unable to save to Photos. Please check your permissions and try again.');
    }
    
    setShowShareView(false);
    setSharing(false);
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

  const onDelete = async () => {
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
  };

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

  const canEdit = currentUser?.id === userId; // Only owner edits

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
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
                {entry.notes && (
                  <Text style={styles.shareNotes}>"{entry.notes}"</Text>
                )}
                <Text style={styles.shareAppName}>Musicboxd</Text>
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

      {/* Share buttons - available to all users */}
      <View style={styles.shareActions}>
        <Button 
          mode="outlined" 
          onPress={handleShareDiaryEntry} 
          disabled={sharing}
          icon={() => <Icon name="share" size={16} color="#666" />}
          loading={sharing}
          style={styles.shareButton}
        >
          Share
        </Button>
        <Button 
          mode="outlined" 
          onPress={handleSaveToPhotos} 
          disabled={sharing}
          icon={() => <Icon name="download" size={16} color="#666" />}
          loading={sharing}
          style={styles.shareButton}
        >
          Save to Photos
        </Button>
      </View>

      {canEdit && (
        <View style={styles.actions}>
          <Button mode="outlined" onPress={() => setShowPicker(v => !v)} disabled={saving}>Edit date</Button>
          <Button mode="contained" onPress={onDelete} disabled={saving} style={{ marginLeft: spacing.sm }}>Delete entry</Button>
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
  );
 }

 const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { 
    padding: spacing.lg,
    paddingBottom: spacing.xl, // Extra padding at bottom for date picker
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
  shareActions: {
    marginVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.md,
  },
  shareButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
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
  subduedText: { color: theme.colors.textSecondary },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  rowAlignCenter: { alignItems: 'center' },
  rowDirection: { flexDirection: 'row' },
  actions: { flexDirection: 'row', marginTop: spacing.lg },

 });