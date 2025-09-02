import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Button, Text, ActivityIndicator } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';

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

  const onChangeDate = async (_: any, selected?: Date) => {
    setShowPicker(false);
    if (!entry || !selected) return;
    setSaving(true);
    try {
      const iso = `${selected.getFullYear()}-${String(selected.getMonth()+1).padStart(2,'0')}-${String(selected.getDate()).padStart(2,'0')}`;
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
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: spacing.sm }}>Loading diary entry…</Text>
      </View>
    );
  }

  const d = new Date(entry.diaryDate + 'T00:00:00');
  const albumYear = album ? new Date(album.releaseDate).getFullYear() : undefined;

  const canEdit = currentUser?.id === userId; // Only owner edits

  return (
    <View style={styles.container}>
      {album && (
        <View style={styles.header}>
          <Image source={{ uri: album.coverImageUrl }} style={styles.cover} />
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

      {canEdit && (
        <View style={styles.actions}>
          <Button mode="outlined" onPress={() => setShowPicker(v => !v)} disabled={saving}>Edit date</Button>
          <Button mode="contained" onPress={onDelete} disabled={saving} style={{ marginLeft: spacing.sm }}>Delete entry</Button>
        </View>
      )}

      {showPicker && (
        <View style={{ marginTop: spacing.md }}>
          <DateTimePicker
            value={d}
            mode="date"
            display="spinner"
            maximumDate={new Date()}
            onChange={onChangeDate}
          />
        </View>
      )}
    </View>
  );
 }

 const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', marginBottom: spacing.lg },
  cover: { width: 96, height: 96, borderRadius: 8 },
  headerTextContainer: { flex: 1, marginLeft: spacing.md },
  subduedText: { color: theme.colors.textSecondary },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  rowAlignCenter: { alignItems: 'center' },
  rowDirection: { flexDirection: 'row' },
  actions: { flexDirection: 'row', marginTop: spacing.lg },

 });