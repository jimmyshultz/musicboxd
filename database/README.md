# Resonare Database

This folder contains the database schema and migration files for the Resonare application.

## Files

### `production_database_complete.sql`
The complete, current production database schema. This file contains:
- All table definitions
- All constraints and relationships
- All indexes for performance
- All functions and triggers
- Complete RLS (Row Level Security) policies
- Proper permissions

**Use this file to set up a new production database from scratch.**

## Migrations

The `migrations/` folder is for future database changes. When you need to modify the database structure:

1. Create a new migration file with format: `YYYY-MM-DD_description.sql`
2. Include both the changes and rollback instructions
3. Test on dev before applying to production
4. Update the main schema file after successful migration

## Database Structure

The current schema includes these main tables:

- `user_profiles` - User profile information
- `albums` - Spotify album data
- `album_listens` - Simple listen tracking
- `album_ratings` - User ratings and reviews
- `diary_entries` - Chronological listening history
- `favorite_albums` - User's top 5 albums with rankings
- `user_follows` - Following relationships
- `follow_requests` - Private profile follow requests
- `user_activities` - Activity feed for social features

## Security

All tables have Row Level Security (RLS) enabled with policies that:
- Respect user privacy settings (public/private profiles)
- Allow users to manage their own data
- Enable social features through following relationships
- Protect sensitive user information

## Performance

The schema includes optimized indexes for:
- User-specific queries
- Activity feed generation
- Search and discovery features
- Social relationship queries