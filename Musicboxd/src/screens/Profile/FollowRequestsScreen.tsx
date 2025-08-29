import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Text, ActivityIndicator, Button, Avatar, Card } from 'react-native-paper';

import { useSelector } from 'react-redux';

import { ProfileStackParamList } from '../../types';
import { FollowRequest } from '../../types/database';
import { RootState } from '../../store';
import { userService } from '../../services/userService';
import { theme, spacing } from '../../utils/theme';

const colors = theme.colors;

export default function FollowRequestsScreen() {
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());

  const loadFollowRequests = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const pendingRequests = await userService.getPendingFollowRequests(currentUser.id);
      setRequests(pendingRequests);
    } catch (error) {
      console.error('Error loading follow requests:', error);
    }
  }, [currentUser]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFollowRequests();
    setRefreshing(false);
  }, [loadFollowRequests]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await loadFollowRequests();
      setLoading(false);
    };
    
    loadData();
  }, [loadFollowRequests]);

  const handleAcceptRequest = async (requestId: string, requesterUsername: string) => {
    setProcessingRequests(prev => new Set(prev).add(requestId));
    
    try {
      await userService.acceptFollowRequest(requestId);
      
      // Remove from requests list
      setRequests(prev => prev.filter(req => req.id !== requestId));
      
      // TODO: Show success message or notification
      console.log(`Accepted follow request from ${requesterUsername}`);
    } catch (error) {
      console.error('Error accepting follow request:', error);
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const handleRejectRequest = async (requestId: string, requesterUsername: string) => {
    setProcessingRequests(prev => new Set(prev).add(requestId));
    
    try {
      await userService.rejectFollowRequest(requestId);
      
      // Remove from requests list
      setRequests(prev => prev.filter(req => req.id !== requestId));
      
      // TODO: Show success message or notification
      console.log(`Rejected follow request from ${requesterUsername}`);
    } catch (error) {
      console.error('Error rejecting follow request:', error);
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };



  const renderRequestCard = (request: FollowRequest) => {
    const isProcessing = processingRequests.has(request.id);
    const requester = request.requester;
    
    if (!requester) return null;

    return (
      <Card key={request.id} style={styles.requestCard}>
        <Card.Content style={styles.requestContent}>
          <View style={styles.userInfo}>
            <Avatar.Image
              size={50}
              source={{ 
                uri: requester.avatar_url || 'https://via.placeholder.com/50x50/cccccc/999999?text=U' 
              }}
              style={styles.avatar}
            />
            <View style={styles.userDetails}>
              <Text variant="titleMedium" style={styles.username}>
                @{requester.username}
              </Text>
              {requester.display_name && (
                <Text variant="bodyMedium" style={styles.displayName}>
                  {requester.display_name}
                </Text>
              )}
              <Text variant="bodySmall" style={styles.requestTime}>
                {formatTimeAgo(new Date(request.created_at))}
              </Text>
            </View>
          </View>
          
          <View style={styles.actionButtons}>
            <Button
              mode="outlined"
              onPress={() => handleRejectRequest(request.id, requester.username)}
              disabled={isProcessing}
              style={[styles.actionButton, styles.rejectButton]}
              labelStyle={styles.rejectButtonText}
            >
              Decline
            </Button>
            <Button
              mode="contained"
              onPress={() => handleAcceptRequest(request.id, requester.username)}
              disabled={isProcessing}
              loading={isProcessing}
              style={[styles.actionButton, styles.acceptButton]}
            >
              Accept
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return '1w+ ago';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={styles.loadingText}>
          Loading follow requests...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {requests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text variant="headlineSmall" style={styles.emptyTitle}>
              No Follow Requests
            </Text>
            <Text variant="bodyLarge" style={styles.emptyMessage}>
              When someone requests to follow your private profile, they'll appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.requestsList}>
            <Text variant="headlineSmall" style={styles.sectionTitle}>
              Follow Requests ({requests.length})
            </Text>
            {requests.map(renderRequestCard)}
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.onSurfaceVariant,
  },
  scrollContainer: {
    flex: 1,
  },
  requestsList: {
    padding: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.lg,
    color: colors.onBackground,
    fontWeight: 'bold',
  },
  requestCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  requestContent: {
    padding: spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    marginRight: spacing.md,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    color: colors.onSurface,
    fontWeight: '600',
  },
  displayName: {
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  requestTime: {
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  actionButton: {
    minWidth: 80,
  },
  rejectButton: {
    borderColor: colors.outline,
  },
  rejectButtonText: {
    color: colors.onSurfaceVariant,
  },
  acceptButton: {
    backgroundColor: colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl * 2,
  },
  emptyTitle: {
    color: colors.onBackground,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  emptyMessage: {
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
  },
});