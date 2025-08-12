import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, SectionList, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { RouteProp, useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useDispatch, useSelector } from 'react-redux';
import { Text, ActivityIndicator, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DiaryEntry, ProfileStackParamList, HomeStackParamList, SearchStackParamList, Album } from '../../types';
import { RootState } from '../../store';
import { DiaryService } from '../../services/diaryService';
import { AlbumService } from '../../services/albumService';
import { fetchDiaryStart, fetchDiarySuccess, fetchDiaryFailure } from '../../store/slices/diarySlice';
import { theme, spacing } from '../../utils/theme';

 type DiaryScreenRouteProp = RouteProp<ProfileStackParamList | HomeStackParamList | SearchStackParamList, 'Diary'>;
 type DiaryScreenNavProp = StackNavigationProp<ProfileStackParamList | HomeStackParamList | SearchStackParamList>;

 export default function DiaryScreen() {
  const route = useRoute<DiaryScreenRouteProp>();
  const navigation = useNavigation<DiaryScreenNavProp>();
  const dispatch = useDispatch();
  const { userId } = route.params;
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const diaryState = useSelector((state: RootState) => state.diary.byUserId[userId]);
  const loading = useSelector((state: RootState) => state.diary.loading);

  const [albumsById, setAlbumsById] = useState<Record<string, Album>>({});
  const [selectedTab, setSelectedTab] = useState<'profile' | 'diary'>('diary');
  const [initialReady, setInitialReady] = useState(false);

  useEffect(() => {
    // Reset readiness when switching users
    setInitialReady(false);
    setAlbumsById({});
  }, [userId]);

  const canView = useMemo(() => {
    // For MVP: assume public; privacy enforcement can be expanded here when social graph is in place
    return true;
  }, []);

  const groupIntoSections = useCallback((entries: DiaryEntry[]) => {
    const groups: Record<string, DiaryEntry[]> = {};
    entries.forEach(entry => {
      const d = new Date(entry.diaryDate + 'T00:00:00');
      const monthHeader = d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
      if (!groups[monthHeader]) groups[monthHeader] = [];
      groups[monthHeader].push(entry);
    });
    return Object.keys(groups).map(header => ({ title: header, data: groups[header] }));
  }, []);

  const loadInitial = useCallback(async () => {
    dispatch(fetchDiaryStart());
    try {
      const { entries, lastMonth, hasMore } = await DiaryService.getDiaryEntriesByUser(userId, { monthWindow: 3 });
      const albumIds = Array.from(new Set(entries.map(e => e.albumId)));
      const responses = await Promise.all(albumIds.map(id => AlbumService.getAlbumById(id)));
      const fetched: Record<string, Album> = {};
      responses.forEach((res, idx) => {
        if (res.success && res.data) {
          fetched[albumIds[idx]] = res.data;
        }
      });
      if (Object.keys(fetched).length > 0) {
        setAlbumsById(prev => ({ ...prev, ...fetched }));
      }
      dispatch(fetchDiarySuccess({ userId, entries, lastMonth, hasMore, reset: true }));
      setInitialReady(true);
    } catch (e: any) {
      dispatch(fetchDiaryFailure(e?.message || 'Failed to load diary'));
    }
  }, [dispatch, userId]);

  const loadMore = useCallback(async () => {
    if (!diaryState?.hasMore || loading) return;
    dispatch(fetchDiaryStart());
    try {
      const { entries, lastMonth, hasMore } = await DiaryService.getDiaryEntriesByUser(userId, {
        startAfterMonth: diaryState.lastMonth,
        monthWindow: 3,
      });
      const albumIds = Array.from(new Set(entries.map(e => e.albumId)));
      const missingIds = albumIds.filter(id => !albumsById[id]);
      if (missingIds.length) {
        const responses = await Promise.all(missingIds.map(id => AlbumService.getAlbumById(id)));
        const fetched: Record<string, Album> = {};
        responses.forEach((res, idx) => {
          if (res.success && res.data) fetched[missingIds[idx]] = res.data;
        });
        if (Object.keys(fetched).length > 0) {
          setAlbumsById(prev => ({ ...prev, ...fetched }));
        }
      }
      dispatch(fetchDiarySuccess({ userId, entries, lastMonth, hasMore }));
    } catch (e: any) {
      dispatch(fetchDiaryFailure(e?.message || 'Failed to load more diary'));
    }
  }, [dispatch, userId, diaryState?.hasMore, diaryState?.lastMonth, loading, albumsById]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const navigateToProfile = () => {
    if (currentUser?.id === userId) {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'ProfileMain' as never }],
        })
      );
    } else {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'UserProfile' as never, params: { userId } as never }],
        })
      );
    }
  };

  const renderRow = ({ item }: { item: DiaryEntry }) => {
    const album = albumsById[item.albumId];
    const date = new Date(item.diaryDate + 'T00:00:00');
    const day = date.getDate();
    const albumYear = album ? new Date(album.releaseDate).getFullYear() : undefined;

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate('DiaryEntryDetails' as any, { entryId: item.id, userId })}
      >
        <Text style={styles.dayNumber}>{day}</Text>
        {album && <Image source={{ uri: album.coverImageUrl }} style={styles.cover} />}
        <View style={styles.rowTextContainer}>
          <Text variant="bodyMedium" numberOfLines={1} style={styles.title}>
            {album ? `${album.title} (${albumYear})` : ''}
          </Text>
          {!!item.ratingAtTime && (
            <Text variant="bodySmall" style={styles.rating}>{'★'.repeat(item.ratingAtTime)}{'☆'.repeat(5 - item.ratingAtTime)}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (!canView) {
    return (
      <View style={styles.center}>
        <Text>Diary is not available due to privacy settings.</Text>
      </View>
    );
  }

  const entries = diaryState?.entries || [];
  const sections = groupIntoSections(entries);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerToggle}>
        <SegmentedButtons
          value={selectedTab}
          onValueChange={(v: any) => {
            if (v === 'profile') navigateToProfile();
            else setSelectedTab('diary');
          }}
          buttons={[
            { value: 'profile', label: 'Profile' },
            { value: 'diary', label: 'Diary' },
          ]}
        />
      </View>

      {(!initialReady && (loading || entries.length === 0)) ? (
        <View style={styles.center}> 
          <ActivityIndicator />
          <Text style={{ marginTop: spacing.sm }}>Loading diary…</Text>
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.center}> 
          {currentUser?.id === userId ? (
            <Text>No diary entries yet. Mark albums as listened and add them to your diary.</Text>
          ) : (
            <Text>No diary entries to show.</Text>
          )}
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}><Text style={styles.sectionHeaderText}>{title}</Text></View>
          )}
          renderItem={renderRow}
          onEndReachedThreshold={0.3}
          onEndReached={loadMore}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
 }

 const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  headerToggle: { paddingHorizontal: spacing.md, paddingTop: 0, paddingBottom: spacing.md, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingBottom: spacing.xl },
  sectionHeader: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: theme.colors.surface },
  sectionHeaderText: { fontWeight: 'bold' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.background },
  dayNumber: { width: 32, textAlign: 'right', marginRight: spacing.md, color: theme.colors.textSecondary },
  cover: { width: 36, height: 36, borderRadius: 4, marginRight: spacing.md },
  rowTextContainer: { flex: 1 },
  title: { fontWeight: '600' },
  rating: { color: theme.colors.primary, marginTop: 2 },
});