import { Album, User, Review, Listen, Activity } from '../types';

// Mock album data with comprehensive track listings
export const mockAlbums: Album[] = [
  {
    id: '1',
    title: 'OK Computer',
    artist: 'Radiohead',
    releaseDate: '1997-06-16',
    genre: ['Alternative Rock', 'Art Rock'],
    coverImageUrl: 'https://i.scdn.co/image/ab67616d0000b273c8b444df094279e70d0ed856',
    description: 'Radiohead\'s third studio album, widely considered one of the greatest albums of all time.',
    trackList: [
      { id: '1-1', trackNumber: 1, title: 'Airbag', duration: 287 },
      { id: '1-2', trackNumber: 2, title: 'Paranoid Android', duration: 383 },
      { id: '1-3', trackNumber: 3, title: 'Subterranean Homesick Alien', duration: 267 },
      { id: '1-4', trackNumber: 4, title: 'Exit Music (For a Film)', duration: 265 },
      { id: '1-5', trackNumber: 5, title: 'Let Down', duration: 299 },
      { id: '1-6', trackNumber: 6, title: 'Karma Police', duration: 261 },
      { id: '1-7', trackNumber: 7, title: 'Fitter Happier', duration: 117 },
      { id: '1-8', trackNumber: 8, title: 'Electioneering', duration: 230 },
      { id: '1-9', trackNumber: 9, title: 'Climbing Up the Walls', duration: 285 },
      { id: '1-10', trackNumber: 10, title: 'No Surprises', duration: 228 },
      { id: '1-11', trackNumber: 11, title: 'Lucky', duration: 259 },
      { id: '1-12', trackNumber: 12, title: 'The Tourist', duration: 324 },
    ],
    externalIds: {
      spotify: '6dVIqQ8qmQ5GBnJ9shOYGE',
    },
  },
  {
    id: '2',
    title: 'In Rainbows',
    artist: 'Radiohead',
    releaseDate: '2007-10-10',
    genre: ['Alternative Rock', 'Art Rock'],
    coverImageUrl: 'https://i.scdn.co/image/ab67616d0000b273f455f624fbc6316c7fb3c9b1',
    description: 'Radiohead\'s seventh studio album, praised for its innovative release strategy and musical content.',
    trackList: [
      { id: '2-1', trackNumber: 1, title: '15 Step', duration: 238 },
      { id: '2-2', trackNumber: 2, title: 'Bodysnatchers', duration: 242 },
      { id: '2-3', trackNumber: 3, title: 'Nude', duration: 261 },
      { id: '2-4', trackNumber: 4, title: 'Weird Fishes/Arpeggi', duration: 318 },
      { id: '2-5', trackNumber: 5, title: 'All I Need', duration: 228 },
      { id: '2-6', trackNumber: 6, title: 'Faust Arp', duration: 130 },
      { id: '2-7', trackNumber: 7, title: 'Reckoner', duration: 290 },
      { id: '2-8', trackNumber: 8, title: 'House of Cards', duration: 339 },
      { id: '2-9', trackNumber: 9, title: 'Jigsaw Falling into Place', duration: 249 },
      { id: '2-10', trackNumber: 10, title: 'Videotape', duration: 287 },
    ],
    externalIds: {
      spotify: '7eyQXxuf2nGj9d2367Gi5f',
    },
  },
  {
    id: '3',
    title: 'To Pimp a Butterfly',
    artist: 'Kendrick Lamar',
    releaseDate: '2015-03-15',
    genre: ['Hip Hop', 'Jazz Rap', 'Conscious Hip Hop'],
    coverImageUrl: 'https://i.scdn.co/image/ab67616d0000b2736ca5c90113b30c3c43ffb8f4',
    description: 'Kendrick Lamar\'s third studio album, exploring themes of racial inequality, depression, and self-love.',
    trackList: [
      { id: '3-1', trackNumber: 1, title: 'Wesley\'s Theory', duration: 287, artist: 'feat. George Clinton & Thundercat' },
      { id: '3-2', trackNumber: 2, title: 'For Free? (Interlude)', duration: 131 },
      { id: '3-3', trackNumber: 3, title: 'King Kunta', duration: 234 },
      { id: '3-4', trackNumber: 4, title: 'Institutionalized', duration: 271, artist: 'feat. Bilal, Anna Wise & Snoop Dogg' },
      { id: '3-5', trackNumber: 5, title: 'These Walls', duration: 300, artist: 'feat. Bilal, Anna Wise & Thundercat' },
      { id: '3-6', trackNumber: 6, title: 'u', duration: 268 },
      { id: '3-7', trackNumber: 7, title: 'Alright', duration: 219 },
      { id: '3-8', trackNumber: 8, title: 'For Sale? (Interlude)', duration: 92 },
      { id: '3-9', trackNumber: 9, title: 'Momma', duration: 283 },
      { id: '3-10', trackNumber: 10, title: 'Hood Politics', duration: 292 },
      { id: '3-11', trackNumber: 11, title: 'How Much a Dollar Cost', duration: 261, artist: 'feat. James Blake & Ronald Isley' },
      { id: '3-12', trackNumber: 12, title: 'Complexion (A Zulu Love)', duration: 264, artist: 'feat. Rapsody' },
      { id: '3-13', trackNumber: 13, title: 'The Blacker the Berry', duration: 328 },
      { id: '3-14', trackNumber: 14, title: 'You Ain\'t Gotta Lie (Momma Said)', duration: 241 },
      { id: '3-15', trackNumber: 15, title: 'i', duration: 341 },
      { id: '3-16', trackNumber: 16, title: 'Mortal Man', duration: 720 },
    ],
    externalIds: {
      spotify: '7ycBtnsMtyVbbwTfJwRjSP',
    },
  },
  {
    id: '4',
    title: 'Blonde',
    artist: 'Frank Ocean',
    releaseDate: '2016-08-20',
    genre: ['R&B', 'Alternative R&B', 'Pop'],
    coverImageUrl: 'https://i.scdn.co/image/ab67616d0000b273c5649add07ed3720be9d5526',
    description: 'Frank Ocean\'s second studio album, a deeply personal and experimental work.',
    trackList: [
      { id: '4-1', trackNumber: 1, title: 'Nikes', duration: 314 },
      { id: '4-2', trackNumber: 2, title: 'Ivy', duration: 249 },
      { id: '4-3', trackNumber: 3, title: 'Pink + White', duration: 184 },
      { id: '4-4', trackNumber: 4, title: 'Be Yourself', duration: 71 },
      { id: '4-5', trackNumber: 5, title: 'Solo', duration: 257 },
      { id: '4-6', trackNumber: 6, title: 'Skyline To', duration: 198 },
      { id: '4-7', trackNumber: 7, title: 'Self Control', duration: 249 },
      { id: '4-8', trackNumber: 8, title: 'Good Guy', duration: 67 },
      { id: '4-9', trackNumber: 9, title: 'Nights', duration: 307 },
      { id: '4-10', trackNumber: 10, title: 'Solo (Reprise)', duration: 93, artist: 'feat. André 3000' },
      { id: '4-11', trackNumber: 11, title: 'Pretty Sweet', duration: 178 },
      { id: '4-12', trackNumber: 12, title: 'Facebook Story', duration: 80 },
      { id: '4-13', trackNumber: 13, title: 'Close to You', duration: 90 },
      { id: '4-14', trackNumber: 14, title: 'White Ferrari', duration: 250 },
      { id: '4-15', trackNumber: 15, title: 'Seigfried', duration: 345 },
      { id: '4-16', trackNumber: 16, title: 'Godspeed (Sweet Dreams)', duration: 198 },
      { id: '4-17', trackNumber: 17, title: 'Futura Free', duration: 549 },
    ],
    externalIds: {
      spotify: '3mH6qwIy9crq0I9YQbOuDf',
    },
  },
  {
    id: '5',
    title: 'Good Kid, M.A.A.D City',
    artist: 'Kendrick Lamar',
    releaseDate: '2012-10-22',
    genre: ['Hip Hop', 'West Coast Hip Hop'],
    coverImageUrl: 'https://i.scdn.co/image/ab67616d0000b273d6dce7b1d9bb3e6f2b6a8b8b',
    description: 'Kendrick Lamar\'s major label debut, a concept album about his experiences growing up in Compton.',
    trackList: [
      { id: '5-1', trackNumber: 1, title: 'Sherane a.k.a Master Splinter\'s Daughter', duration: 279 },
      { id: '5-2', trackNumber: 2, title: 'Bitch, Don\'t Kill My Vibe', duration: 320 },
      { id: '5-3', trackNumber: 3, title: 'Backseat Freestyle', duration: 213 },
      { id: '5-4', trackNumber: 4, title: 'The Art of Peer Pressure', duration: 332 },
      { id: '5-5', trackNumber: 5, title: 'Money Trees', duration: 386, artist: 'feat. Jay Rock' },
      { id: '5-6', trackNumber: 6, title: 'Poetic Justice', duration: 301, artist: 'feat. Drake' },
      { id: '5-7', trackNumber: 7, title: 'good kid', duration: 347 },
      { id: '5-8', trackNumber: 8, title: 'm.A.A.d city', duration: 339, artist: 'feat. MC Eiht' },
      { id: '5-9', trackNumber: 9, title: 'Swimming Pools (Drank)', duration: 312 },
      { id: '5-10', trackNumber: 10, title: 'Sing About Me, I\'m Dying of Thirst', duration: 720 },
      { id: '5-11', trackNumber: 11, title: 'Real', duration: 474, artist: 'feat. Anna Wise' },
      { id: '5-12', trackNumber: 12, title: 'Compton', duration: 248, artist: 'feat. Dr. Dre' },
    ],
    externalIds: {
      spotify: '4eLPsYPBmXABThSJ821sqY',
    },
  },
];

// Mock user data
export const mockUsers: User[] = [
  {
    id: 'user1',
    username: 'musiclover2024',
    email: 'music@example.com',
    profilePicture: 'https://randomuser.me/api/portraits/men/32.jpg',
    bio: 'Passionate about discovering new music across all genres',
    joinedDate: new Date('2024-01-15'),
    lastActiveDate: new Date(),
    preferences: {
      favoriteGenres: ['Alternative Rock', 'Hip Hop', 'Jazz'],
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
    username: 'vinylcollector',
    email: 'vinyl@example.com',
    profilePicture: 'https://randomuser.me/api/portraits/women/44.jpg',
    bio: 'Collecting records since 1995 🎶',
    joinedDate: new Date('2023-11-20'),
    lastActiveDate: new Date(Date.now() - 86400000), // Yesterday
    preferences: {
      favoriteGenres: ['Classic Rock', 'Blues', 'Soul'],
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

// Mock reviews
export const mockReviews: Review[] = [
  {
    id: 'review1',
    userId: 'user1',
    albumId: '1',
    rating: 5,
    reviewText: 'A masterpiece that defined a generation. Every track is perfection.',
    dateReviewed: new Date('2024-01-20'),
    likesCount: 24,
    commentsCount: 8,
  },
  {
    id: 'review2',
    userId: 'user2',
    albumId: '3',
    rating: 5,
    reviewText: 'Kendrick\'s most important work. A powerful statement on race and society.',
    dateReviewed: new Date('2024-01-18'),
    likesCount: 31,
    commentsCount: 12,
  },
];

// Mock activity feed
export const mockActivities: Activity[] = [
  {
    id: 'activity1',
    userId: 'user1',
    type: 'review',
    albumId: '1',
    reviewId: 'review1',
    timestamp: new Date('2024-01-20'),
  },
  {
    id: 'activity2',
    userId: 'user2',
    type: 'listen',
    albumId: '4',
    timestamp: new Date('2024-01-19'),
  },
  {
    id: 'activity3',
    userId: 'user1',
    type: 'listen',
    albumId: '2',
    timestamp: new Date('2024-01-18'),
  },
];

// Popular genres for quick search
export const popularGenres = [
  'Rock',
  'Hip Hop',
  'Pop',
  'Electronic',
  'Jazz',
  'Classical',
  'R&B',
  'Country',
  'Folk',
  'Metal',
];