import { User, Activity, Follow } from '../types';
import { AlbumService } from './albumService';

class UserService {
  // Mock data for demonstration - in real app, these would be API calls
  
  // Track follow relationships - initialize with some sample relationships
  private followRelationships: Follow[] = [
    // Some initial follows to make the social graph more interesting
    {
      followerId: 'user1',
      followingId: 'user2',
      dateFollowed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
    },
    {
      followerId: 'user2',
      followingId: 'user3',
      dateFollowed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },
    {
      followerId: 'user3',
      followingId: 'user1',
      dateFollowed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    },
    // Add relationships for current user
    {
      followerId: 'current-user-id',
      followingId: 'user1',
      dateFollowed: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    },
    {
      followerId: 'current-user-id',
      followingId: 'user2',
      dateFollowed: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
    },
    {
      followerId: 'user1',
      followingId: 'current-user-id',
      dateFollowed: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
    },
    {
      followerId: 'user3',
      followingId: 'current-user-id',
      dateFollowed: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
    },
  ];
  
  private mockUsers: User[] = [
    {
      id: 'current-user-id',
      username: 'musiclover2024',
      email: 'music@example.com',
      profilePicture: 'https://randomuser.me/api/portraits/men/32.jpg',
      bio: 'Passionate about discovering new music across all genres 🎶',
      joinedDate: new Date('2024-01-15'),
      lastActiveDate: new Date(),
      preferences: {
        favoriteGenres: ['Indie Rock', 'Electronic', 'Jazz'],
        favoriteAlbumIds: ['1', '3'], // Add missing property
        notifications: {
          newFollowers: true,
          reviewLikes: true,
          friendActivity: true,
        },
        privacy: {
          profileVisibility: 'public',
          activityVisibility: 'public',
        },
      },
    },
    {
      id: 'user1',
      username: 'indierocklover',
      email: 'indie@music.com',
      profilePicture: 'https://randomuser.me/api/portraits/women/44.jpg',
      bio: 'Obsessed with indie rock and discovering underground bands 🎸',
      joinedDate: new Date('2023-06-15'),
      lastActiveDate: new Date(),
      preferences: {
        favoriteGenres: ['Indie Rock', 'Alternative', 'Post-Rock'],
        favoriteAlbumIds: ['2', '4'], // Add missing property
        notifications: {
          newFollowers: true,
          reviewLikes: true,
          friendActivity: true,
        },
        privacy: {
          profileVisibility: 'public',
          activityVisibility: 'public',
        },
      },
    },
    {
      id: 'user2',
      username: 'jazzfanatic',
      email: 'jazz@music.com',
      profilePicture: 'https://randomuser.me/api/portraits/men/55.jpg',
      bio: 'Jazz collector with 500+ vinyl records. Always hunting for rare pressings 🎷',
      joinedDate: new Date('2023-03-20'),
      lastActiveDate: new Date(),
      preferences: {
        favoriteGenres: ['Jazz', 'Fusion', 'Bebop'],
        favoriteAlbumIds: ['5', '6'], // Add missing property
        notifications: {
          newFollowers: true,
          reviewLikes: true,
          friendActivity: true,
        },
        privacy: {
          profileVisibility: 'public',
          activityVisibility: 'public',
        },
      },
    },
    {
      id: 'user3',
      username: 'hiphophead',
      email: 'hiphop@music.com',
      profilePicture: 'https://randomuser.me/api/portraits/men/23.jpg',
      bio: 'Real hip-hop never died 🎤 Vinyl collector and beat maker',
      joinedDate: new Date('2023-08-10'),
      lastActiveDate: new Date(),
      preferences: {
        favoriteGenres: ['Hip-Hop', 'Rap', 'R&B'],
        favoriteAlbumIds: ['7', '8'], // Add missing property
        notifications: {
          newFollowers: true,
          reviewLikes: false,
          friendActivity: true,
        },
        privacy: {
          profileVisibility: 'public',
          activityVisibility: 'friends',
        },
      },
    },
  ];

  private mockActivity: Activity[] = [
    {
      id: '1',
      userId: 'user1',
      type: 'review',
      albumId: 'album1',
      reviewId: 'review1',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      id: '2',
      userId: 'user1',
      type: 'listen',
      albumId: 'album2',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    },
    {
      id: '3',
      userId: 'user2',
      type: 'list_created',
      listId: 'list1',
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
    },
    {
      id: '4',
      userId: 'user3',
      type: 'follow',
      followedUserId: 'user1',
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
    },
    {
      id: '5',
      userId: 'user2',
      type: 'review',
      albumId: 'album3',
      reviewId: 'review2',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  ];

  // Get user by ID
  async getUserById(userId: string): Promise<User | null> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const user = this.mockUsers.find(u => u.id === userId);
    return user || null;
  }

  // Search users by username
  async searchUsers(query: string): Promise<User[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (!query.trim()) return [];
    
    return this.mockUsers.filter(user => 
      user.username.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Get user's activity feed
  async getUserActivity(userId: string, limit: number = 10): Promise<Activity[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return this.mockActivity
      .filter(activity => activity.userId === userId)
      .slice(0, limit);
  }

  // Get activity feed for followed users
  async getFollowingActivity(followingUserIds: string[], limit: number = 20): Promise<Activity[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return this.mockActivity
      .filter(activity => followingUserIds.includes(activity.userId))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Follow a user
  async followUser(userId: string): Promise<{ followerId: string; followingId: string; dateFollowed: string }> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const follow: Follow = {
      followerId: 'current-user-id',
      followingId: userId,
      dateFollowed: new Date(),
    };
    
    // Add to our follow relationships tracking
    const existingFollow = this.followRelationships.find(
      f => f.followerId === follow.followerId && f.followingId === follow.followingId
    );
    
    if (!existingFollow) {
      this.followRelationships.push(follow);
    }
    
    // Return serialized version to avoid Redux serialization issues
    return {
      followerId: follow.followerId,
      followingId: follow.followingId,
      dateFollowed: follow.dateFollowed.toISOString(),
    };
  }

  // Unfollow a user
  async unfollowUser(userId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Remove from our follow relationships tracking
    this.followRelationships = this.followRelationships.filter(
      f => !(f.followerId === 'current-user-id' && f.followingId === userId)
    );
  }

  // Get user's followers
  async getUserFollowers(userId: string): Promise<User[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Get all users who follow this user
    const followerIds = this.followRelationships
      .filter(f => f.followingId === userId)
      .map(f => f.followerId);
    
    // Return the user objects for those IDs
    return this.mockUsers.filter(user => followerIds.includes(user.id));
  }

  // Get users that a user is following
  async getUserFollowing(userId: string): Promise<User[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Get all users this user is following
    const followingIds = this.followRelationships
      .filter(f => f.followerId === userId)
      .map(f => f.followingId);
    
    // Return the user objects for those IDs
    return this.mockUsers.filter(user => followingIds.includes(user.id));
  }

  // Get suggested users to follow
  async getSuggestedUsers(currentUserId: string, limit: number = 5): Promise<User[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simple suggestion algorithm - exclude current user and already followed users
    return this.mockUsers
      .filter(user => user.id !== currentUserId)
      .slice(0, limit);
  }

  // Update user profile
  async updateUserProfile(userId: string, updates: Partial<User>): Promise<User> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const userIndex = this.mockUsers.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      throw new Error('User not found');
    }
    
    this.mockUsers[userIndex] = { ...this.mockUsers[userIndex], ...updates };
    return this.mockUsers[userIndex];
  }

  // Get current user's follower count  
  getCurrentUserFollowerCount(): number {
    return this.followRelationships.filter(f => f.followingId === 'current-user-id').length;
  }

  // Get current user's following count
  getCurrentUserFollowingCount(): number {
    return this.followRelationships.filter(f => f.followerId === 'current-user-id').length;
  }

  // Get user statistics
  async getUserStats(userId: string) {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Calculate real follower and following counts for the specific user
    const followingCount = this.followRelationships.filter(f => f.followerId === userId).length;
    const followersCount = this.followRelationships.filter(f => f.followingId === userId).length;
    
    // Get real album stats from AlbumService
    const albumStats = await AlbumService.getUserAlbumStats(userId);
    
    // Get static data for lists (would be from a lists service in real app)
    const getListsCreated = (targetUserId: string) => {
      if (targetUserId === 'current-user-id') return 3;
      if (targetUserId === 'user1') return 5;
      if (targetUserId === 'user2') return 12;
      if (targetUserId === 'user3') return 8;
      return 0;
    };
    
    return {
      albumsListened: albumStats.albumsListened,
      reviews: albumStats.reviews,
      averageRating: albumStats.averageRating,
      following: followingCount,
      followers: followersCount,
      listsCreated: getListsCreated(userId),
    };
  }
}

export const userService = new UserService();