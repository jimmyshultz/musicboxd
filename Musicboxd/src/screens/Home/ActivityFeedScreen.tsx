import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Text, ActivityIndicator, Avatar, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector } from 'react-redux';

import { HomeStackParamList } from '../../types';
import { RootState } from '../../store';
import { activityService, ActivityWithDetails } from '../../services/activityService';
import { userService } from '../../services/userService';
import { colors, spacing } from '../../utils/theme';

type ActivityFeedScreenNavigationProp = StackNavigationProp<HomeStackParamList>;

export default function ActivityFeedScreen() {
  const navigation = useNavigation<ActivityFeedScreenNavigationProp>();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [activities, setActivities] = useState<ActivityWithDetails[]>([]);
  const [globalActivities, setGlobalActivities] = useState<ActivityWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'following' | 'discover'>('following');

  const loadActivityFeed = useCallback(async (isRefresh = false) => {
    if (!user) return;

    try {
      if (!isRefresh) setLoading(true);

      const [friendsActivities, discoverActivities] = await Promise.all([
        activityService.getActivityFeed(user.id, 20),
        activityService.getGlobalActivityFeed(20),
      ]);

      setActivities(friendsActivities);
      setGlobalActivities(discoverActivities);
    } catch (error) {
      console.error('Error loading activity feed:', error);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadActivityFeed();
  }, [loadActivityFeed]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadActivityFeed(true);
  }, [loadActivityFeed]);

  const navigateToAlbum = (albumId: string) => {
    navigation.navigate('AlbumDetails', { albumId });
  };

  const navigateToUserProfile = (userId: string) => {
    navigation.navigate('UserProfile', { userId });
  };

  const navigateToFollowers = () => {
    if (user) {
      navigation.navigate('Followers', { 
        userId: user.id, 
        username: user.user_metadata?.username || 'user',
        initialTab: 'following'
      });
    }
  };

  const renderActivityItem = (activity: ActivityWithDetails, index: number) => (
    <View key={`${activity.id}-${index}`} style={styles.activityCard}>
      <View style={styles.activityHeader}>
        <TouchableOpacity 
          style={styles.userInfo}
          onPress={() => navigateToUserProfile(activity.user_profile.id)}
        >
          <Avatar.Image
            size={40}
            source={{ 
              uri: activity.user_profile.avatar_url || 
                `https://ui-avatars.com/api/?name=${encodeURIComponent(activity.user_profile.username)}&background=random` 
            }}
          />
          <View style={styles.userDetails}>
            <Text variant="labelLarge" style={styles.username}>
              {activity.user_profile.display_name || activity.user_profile.username}
            </Text>
            <Text variant="bodySmall" style={styles.activityTime}>
              {activityService.formatActivityTime(activity.created_at)}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.albumInfo}
        onPress={() => navigateToAlbum(activity.album.id)}
      >
        <Image 
          source={{ uri: activity.album.image_url || 'https://via.placeholder.com/60x60/cccccc/999999?text=♪' }} 
          style={styles.albumCover} 
        />
        <View style={styles.albumDetails}>
          <Text variant="titleMedium" numberOfLines={2} style={styles.albumTitle}>
            {activity.album.name}
          </Text>
          <Text variant="bodyMedium" style={styles.artistName}>
            {activity.album.artist_name}
          </Text>
          <View style={styles.activityInfo}>
            <Text variant="bodySmall" style={styles.activityType}>
              {activity.activity_type === 'listen' && '🎧 Listened'}
              {activity.activity_type === 'rating' && `⭐ Rated ${activity.rating}/5`}
              {activity.activity_type === 'review' && '📝 Reviewed'}
            </Text>
            {activity.review_excerpt && (
              <Text variant="bodySmall" numberOfLines={2} style={styles.reviewExcerpt}>
                "{activity.review_excerpt}"
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => {
    if (viewMode === 'following') {
      return (
        <View style={styles.emptyStateContainer}>
          <Text variant="headlineSmall" style={styles.emptyStateTitle}>
            Your feed is empty
          </Text>
          <Text variant="bodyMedium" style={styles.emptyStateText}>
            Follow other users to see their music activity here
          </Text>
          <Button 
            mode="contained" 
            onPress={navigateToFollowers}
            style={styles.followButton}
          >
            Find people to follow
          </Button>
        </View>
      );
    } else {
      return (
        <View style={styles.emptyStateContainer}>
          <Text variant="headlineSmall" style={styles.emptyStateTitle}>
            No recent activity
          </Text>
          <Text variant="bodyMedium" style={styles.emptyStateText}>
            Be the first to rate and review albums!
          </Text>
        </View>
      );
    }
  };

  const currentActivities = viewMode === 'following' ? activities : globalActivities;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text variant="bodyMedium" style={styles.loadingText}>
          Loading activity feed...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* View Mode Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'following' && styles.activeToggle]}
          onPress={() => setViewMode('following')}
        >
          <Text style={[styles.toggleText, viewMode === 'following' && styles.activeToggleText]}>
            Following
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'discover' && styles.activeToggle]}
          onPress={() => setViewMode('discover')}
        >
          <Text style={[styles.toggleText, viewMode === 'discover' && styles.activeToggleText]}>
            Discover
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {currentActivities.length > 0 ? (
          currentActivities.map((activity, index) => renderActivityItem(activity, index))
        ) : (
          renderEmptyState()
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceVariant,
    margin: spacing.md,
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeToggle: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  activeToggleText: {
    color: colors.onPrimary,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
  },
  activityCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 12,
    padding: spacing.md,
  },
  activityHeader: {
    marginBottom: spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userDetails: {
    marginLeft: spacing.sm,
  },
  username: {
    fontWeight: '600',
  },
  activityTime: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  albumInfo: {
    flexDirection: 'row',
  },
  albumCover: {
    width: 60,
    height: 60,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  albumDetails: {
    flex: 1,
    marginLeft: spacing.md,
  },
  albumTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  artistName: {
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  activityInfo: {
    marginTop: spacing.xs,
  },
  activityType: {
    color: colors.primary,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  reviewExcerpt: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  emptyStateTitle: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  emptyStateText: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  followButton: {
    marginTop: spacing.md,
  },
});