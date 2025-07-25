import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  ActivityIndicator,
  IconButton,
} from 'react-native-paper';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector } from 'react-redux';

import { theme, spacing, shadows } from '../../utils/theme';
import { Review, Album, HomeStackParamList, SearchStackParamList, ProfileStackParamList } from '../../types';
import { AlbumService } from '../../services/albumService';
import { RootState } from '../../store';

type UserReviewsScreenRouteProp = RouteProp<
  HomeStackParamList | SearchStackParamList | ProfileStackParamList,
  'UserReviews'
>;
type UserReviewsScreenNavigationProp = StackNavigationProp<ProfileStackParamList>;

// Icon component to avoid creating it during render
const arrowIconStyle = { fontSize: 20, color: '#666' };
const ArrowLeftIcon = (props: any) => <Text style={{ ...arrowIconStyle, color: props.color || '#666' }}>←</Text>;


interface ReviewData {
  review: Review;
  album: Album;
}

const StarDisplay = ({ rating }: { rating: number }) => (
  <View style={styles.starContainer}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Text
        key={star}
        style={[
          styles.star,
          star <= rating ? styles.starFilled : styles.starEmpty
        ]}
      >
        {star <= rating ? '★' : '☆'}
      </Text>
    ))}
  </View>
);

export default function UserReviewsScreen() {
  const route = useRoute<UserReviewsScreenRouteProp>();
  const navigation = useNavigation<UserReviewsScreenNavigationProp>();
  const { userId, username } = route.params;
  const { user: currentUser } = useSelector((state: RootState) => state.auth);

  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserReviews = useCallback(async () => {
    setLoading(true);
    try {
      const userReviews = await AlbumService.getUserReviews(userId);
      
      // Get album details for each review
      const albumPromises = userReviews.map(async (review) => {
        const albumResponse = await AlbumService.getAlbumById(review.albumId);
        return {
          review,
          album: albumResponse.data!,
        };
      });

      const reviewsData = await Promise.all(albumPromises);
      // Filter out any failed album fetches and sort by review date (newest first)
      const validReviews = reviewsData
        .filter(data => data.album)
        .sort((a, b) => new Date(b.review.dateReviewed).getTime() - new Date(a.review.dateReviewed).getTime());
      
      setReviews(validReviews);
    } catch (error) {
      console.error('Error loading user reviews:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUserReviews();
  }, [loadUserReviews]);

  const navigateToAlbum = (albumId: string) => {
    navigation.navigate('AlbumDetails', { albumId });
  };

  const formatReviewDate = (date: Date) => {
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const renderReviewCard = (data: ReviewData) => (
    <TouchableOpacity
      key={data.review.id}
      style={styles.reviewCard}
      onPress={() => navigateToAlbum(data.album.id)}
    >
      <View style={styles.reviewHeader}>
        <Image source={{ uri: data.album.coverImageUrl }} style={styles.albumCover} />
        <View style={styles.albumInfo}>
          <Text variant="titleMedium" numberOfLines={2} style={styles.albumTitle}>
            {data.album.title}
          </Text>
          <Text variant="bodyMedium" numberOfLines={1} style={styles.artistName}>
            {data.album.artist}
          </Text>
          <View style={styles.ratingRow}>
            <StarDisplay rating={data.review.rating} />
            <Text variant="bodySmall" style={styles.reviewDate}>
              {formatReviewDate(new Date(data.review.dateReviewed))}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={styles.loadingText}>
          Loading ratings...
        </Text>
      </View>
    );
  }

  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, data) => sum + data.review.rating, 0) / reviews.length
    : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon={ArrowLeftIcon}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        />
        <View style={styles.headerContent}>
          <Text variant="headlineSmall" style={styles.headerTitle}>
            Ratings
          </Text>
          <Text variant="bodyMedium" style={styles.headerSubtitle}>
            @{username} • {reviews.length} rating{reviews.length !== 1 ? 's' : ''}
            {reviews.length > 0 && ` • ${averageRating.toFixed(1)}★ avg`}
          </Text>
        </View>
      </View>

      {reviews.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text variant="titleLarge" style={styles.emptyTitle}>
            No Ratings Yet
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            {userId === currentUser?.id ? 'Start rating albums and they\'ll appear here!' : `${username} hasn't rated any albums yet.`}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.reviewsList}>
            {reviews.map(renderReviewCard)}
          </View>
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
    </SafeAreaView>
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    margin: 0,
  },
  headerContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: theme.colors.textSecondary,
    marginTop: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  reviewsList: {
    padding: spacing.lg,
  },
  reviewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  reviewHeader: {
    flexDirection: 'row',
    padding: spacing.md,
  },
  albumCover: {
    width: 80,
    height: 80,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  albumInfo: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'space-between',
  },
  albumTitle: {
    fontWeight: '600',
  },
  artistName: {
    color: theme.colors.textSecondary,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  starContainer: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 16,
    marginRight: 2,
  },
  starFilled: {
    color: theme.colors.primary,
  },
  starEmpty: {
    color: '#ccc',
  },
  reviewDate: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontWeight: 'bold',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  emptyText: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomPadding: {
    height: spacing.xl,
  },
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
});