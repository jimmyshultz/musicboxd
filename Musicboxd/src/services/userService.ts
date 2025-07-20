import { User, Activity, Follow } from '../types';

class UserService {
  // Mock data for demonstration - in real app, these would be API calls
  private mockUsers: User[] = [
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
  async followUser(userId: string): Promise<Follow> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // In real app, this would make an API call
    const follow: Follow = {
      followerId: 'current-user-id', // Would be actual current user ID
      followingId: userId,
      dateFollowed: new Date(),
    };
    
    return follow;
  }

  // Unfollow a user
  async unfollowUser(userId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // In real app, this would make an API call to remove the follow relationship
    console.log(`Unfollowed user ${userId}`);
  }

  // Get user's followers
  async getUserFollowers(userId: string): Promise<User[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Mock implementation - in real app, this would query the database
    if (userId === 'user1') {
      return [this.mockUsers[1], this.mockUsers[2]]; // user2 and user3 follow user1
    } else if (userId === 'user2') {
      return [this.mockUsers[0]]; // user1 follows user2
    }
    
    return [];
  }

  // Get users that a user is following
  async getUserFollowing(userId: string): Promise<User[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Mock implementation
    if (userId === 'user1') {
      return [this.mockUsers[1]]; // user1 follows user2
    } else if (userId === 'user2') {
      return [this.mockUsers[0], this.mockUsers[2]]; // user2 follows user1 and user3
    }
    
    return [];
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

  // Get user statistics
  async getUserStats(userId: string) {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Mock statistics - in real app, this would aggregate from the database
    const mockStats = {
      user1: {
        albumsListened: 89,
        reviews: 34,
        following: 23,
        followers: 28,
        listsCreated: 5,
      },
      user2: {
        albumsListened: 156,
        reviews: 67,
        following: 41,
        followers: 52,
        listsCreated: 12,
      },
      user3: {
        albumsListened: 203,
        reviews: 45,
        following: 67,
        followers: 89,
        listsCreated: 8,
      },
    };
    
    return mockStats[userId as keyof typeof mockStats] || {
      albumsListened: 0,
      reviews: 0,
      following: 0,
      followers: 0,
      listsCreated: 0,
    };
  }
}

export const userService = new UserService();