# Staging Environment Setup Guide

This guide walks through setting up a separate Supabase project for staging/testing purposes before deploying to production.

## 🎯 Overview

Week 5 of the production roadmap requires setting up a **staging environment** to test all social features before production deployment. This involves:

1. Creating a separate Supabase project for staging
2. Configuring environment variables
3. Setting up database schema
4. Testing data migration
5. Validating all features work in staging

## 📋 Prerequisites

- Existing Supabase account
- Current development environment working
- Access to production database schema

## 🚀 Step 1: Create Staging Supabase Project

### 1.1 Create New Project
1. Go to [Supabase Dashboard](https://app.supabase.io)
2. Click "New Project"
3. Choose your organization
4. Fill in project details:
   - **Name**: `resonare-staging`
   - **Database Password**: Generate a strong password (save it securely)
   - **Region**: Same as your production project
5. Click "Create new project"

### 1.2 Get Project Credentials
Once the project is created, go to Settings → API:
- **Project URL**: `https://your-project-id.supabase.co`
- **Project API Key (anon public)**: `eyJ...` (anon key)
- **Project API Key (service_role)**: `eyJ...` (service key - keep secure)

## 🗄️ Step 2: Set Up Database Schema

### 2.1 Run Database Schema
1. Go to your staging project dashboard
2. Navigate to SQL Editor
3. **IMPORTANT**: Copy the entire contents of `/database/schema_v2.sql` (NOT schema.sql)
4. Paste and run the SQL script
5. Verify all tables are created:
   - `user_profiles`
   - `albums`
   - `album_listens` (NEW in V2)
   - `album_ratings` (NEW in V2)
   - `diary_entries` (NEW in V2)
   - `user_follows`
   - `user_activities`

### 2.2 Verify Indexes and Triggers
Ensure all indexes and triggers are properly created:
```sql
-- Check tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check indexes
SELECT indexname, tablename FROM pg_indexes 
WHERE schemaname = 'public';

-- Check functions and triggers
SELECT trigger_name, event_object_table FROM information_schema.triggers 
WHERE trigger_schema = 'public';
```

## ⚙️ Step 3: Environment Configuration

### 3.1 Create Staging Environment File
Create a new file `.env.staging` in your project root:

```bash
# Staging Environment Variables
SUPABASE_URL=https://your-staging-project-id.supabase.co
SUPABASE_ANON_KEY=your-staging-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-staging-service-role-key

# Spotify API (can use same as development)
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret

# Environment identifier
NODE_ENV=staging
ENVIRONMENT=staging
```

### 3.2 Update Supabase Configuration
Update `src/services/supabase.ts` to handle multiple environments:

```typescript
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

// Environment-specific configuration
const getSupabaseConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'staging':
      return {
        url: process.env.SUPABASE_STAGING_URL!,
        key: process.env.SUPABASE_STAGING_ANON_KEY!,
      };
    case 'production':
      return {
        url: process.env.SUPABASE_PRODUCTION_URL!,
        key: process.env.SUPABASE_PRODUCTION_ANON_KEY!,
      };
    default:
      return {
        url: process.env.SUPABASE_URL!,
        key: process.env.SUPABASE_ANON_KEY!,
      };
  }
};

const config = getSupabaseConfig();
export const supabase = createClient<Database>(config.url, config.key);
```

## 🔑 Step 4: Authentication Setup

### 4.1 Configure Google OAuth for Staging
1. Go to Supabase Dashboard → Authentication → Settings
2. Add your OAuth providers:
   - **Google**: Use the same client ID/secret as development
   - **Redirect URLs**: Add staging URLs:
     - `https://your-staging-project-id.supabase.co/auth/v1/callback`
     - Your staging app's deep link URLs

### 4.2 Configure Row Level Security
The RLS policies from the schema should already be applied. Verify by:
1. Go to Database → Policies
2. Ensure all tables have proper policies:
   - `user_profiles`: Public read for non-private, user update own
   - `user_albums`: Users can manage own, view public
   - `user_follows`: Users can manage own follows
   - `user_activities`: Public read for non-private users

## 📱 Step 5: App Configuration

### 5.1 Create Staging Build Configuration
Update your `package.json` to support staging builds:

```json
{
  "scripts": {
    "start": "expo start",
    "start:staging": "NODE_ENV=staging expo start",
    "build:staging": "NODE_ENV=staging expo build:ios",
    "test:staging": "NODE_ENV=staging jest"
  }
}
```

### 5.2 Environment Detection in App
Add environment detection to your app:

```typescript
// src/config/environment.ts
export const Environment = {
  isDevelopment: __DEV__ && process.env.NODE_ENV !== 'staging',
  isStaging: process.env.NODE_ENV === 'staging',
  isProduction: process.env.NODE_ENV === 'production',
  
  getEnvironmentName: () => {
    if (Environment.isProduction) return 'Production';
    if (Environment.isStaging) return 'Staging';
    return 'Development';
  }
};
```

## 🧪 Step 6: Testing & Validation

### 6.1 Feature Testing Checklist
Test all Week 5 deliverables in staging:

- [ ] **User Search & Discovery**
  - [ ] Search users by username/display name
  - [ ] View public user profiles
  - [ ] User search performance (<2s)

- [ ] **Follow System**
  - [ ] Follow/unfollow users
  - [ ] Following/followers lists
  - [ ] Follow counts update correctly
  - [ ] Prevent self-follows

- [ ] **Activity Feed**
  - [ ] Friends' activity appears in feed
  - [ ] Global activity feed for discovery
  - [ ] Activity types (listen, rating, review)
  - [ ] Real-time activity generation
  - [ ] Private users excluded from public feeds

- [ ] **Privacy Controls**
  - [ ] Toggle private/public profile
  - [ ] Private profiles hidden from search
  - [ ] Private users' activities not in global feed
  - [ ] Settings screen functionality

### 6.2 Database Testing
```sql
-- Test user creation
INSERT INTO auth.users (id, email) VALUES 
('test-user-1', 'test1@staging.com'),
('test-user-2', 'test2@staging.com');

-- Test follow relationships
INSERT INTO user_follows (follower_id, following_id) VALUES 
('test-user-1', 'test-user-2');

-- Test activity generation (should trigger automatically)
INSERT INTO user_albums (user_id, album_id, rating, is_listened) VALUES 
('test-user-1', 'test-album-1', 5, true);

-- Verify activity was created
SELECT * FROM user_activities WHERE user_id = 'test-user-1';
```

### 6.3 Performance Testing
- Test app with 10-20 users
- Create test data for realistic scenarios
- Verify API response times (<500ms)
- Test concurrent user operations

## 🔄 Step 7: Data Migration Strategy

### 7.1 Development to Staging Migration
If you need to migrate development data to staging:

```sql
-- Export from development (run in dev Supabase SQL Editor)
\copy user_profiles TO 'user_profiles.csv' CSV HEADER;
\copy albums TO 'albums.csv' CSV HEADER;
\copy user_albums TO 'user_albums.csv' CSV HEADER;

-- Import to staging (run in staging Supabase SQL Editor)
\copy user_profiles FROM 'user_profiles.csv' CSV HEADER;
\copy albums FROM 'albums.csv' CSV HEADER;
\copy user_albums FROM 'user_albums.csv' CSV HEADER;
```

### 7.2 Staging to Production Migration
Document the process for later production deployment:
1. Export staging data
2. Set up production Supabase project
3. Run schema migrations
4. Import validated data
5. Update production environment variables

## 🔍 Step 8: Monitoring & Debugging

### 8.1 Staging Monitoring
- Enable Supabase logging and metrics
- Monitor API usage and performance
- Track user interactions and errors
- Set up alerts for critical issues

### 8.2 Debug Configuration
Add staging-specific logging:

```typescript
// src/utils/logger.ts
import { Environment } from '../config/environment';

export const Logger = {
  log: (message: string, data?: any) => {
    if (Environment.isDevelopment || Environment.isStaging) {
      console.log(`[${Environment.getEnvironmentName()}] ${message}`, data);
    }
  },
  
  error: (message: string, error?: any) => {
    console.error(`[${Environment.getEnvironmentName()}] ${message}`, error);
    
    // In staging, could send to error tracking service
    if (Environment.isStaging) {
      // Send to error tracking
    }
  }
};
```

## ✅ Step 9: Staging Validation Checklist

Before considering staging complete:

### Database & Schema
- [ ] All tables created successfully
- [ ] All indexes applied
- [ ] All triggers functioning
- [ ] RLS policies working correctly

### Authentication
- [ ] Google Sign-In working
- [ ] User profile creation automatic
- [ ] Session management working
- [ ] Logout functionality working

### Core Features
- [ ] Album search and display
- [ ] Rating and listening functionality
- [ ] User profile management
- [ ] Statistics calculation

### Social Features (Week 5)
- [ ] User search functional
- [ ] Follow/unfollow working
- [ ] Activity feed displaying correctly
- [ ] Privacy controls functional

### Performance
- [ ] API response times <500ms
- [ ] Search performance <2s
- [ ] App startup time acceptable
- [ ] Memory usage within limits

## 🚀 Step 10: Deploy to Staging

### 10.1 Build Staging Version
```bash
# Build staging version
NODE_ENV=staging expo build:ios

# Or for testing locally
NODE_ENV=staging expo start
```

### 10.2 Distribute for Testing
- Use Expo's internal distribution
- Share with 5-10 test users
- Collect feedback and usage data
- Monitor for crashes and errors

## 📝 Documentation

Create staging-specific documentation:
- API endpoints and rate limits
- Test user accounts and credentials
- Known issues and limitations
- Feedback collection process

## 🔄 Next Steps

After staging validation:
1. Document any issues found
2. Fix critical bugs
3. Performance optimizations
4. Prepare for Week 6 (Performance & Polish)
5. Plan production deployment (Week 7)

---

## 🆘 Troubleshooting

### Common Issues

**Database Connection Errors**
- Verify environment variables are correct
- Check Supabase project is active
- Verify RLS policies allow operations

**Authentication Issues**
- Confirm OAuth redirect URLs
- Check Google OAuth configuration
- Verify JWT tokens are valid

**Missing Data**
- Confirm schema migration completed
- Check triggers are creating activities
- Verify RLS policies allow data access

**Performance Issues**
- Check database indexes are applied
- Monitor Supabase metrics
- Optimize slow queries

---

*This staging environment provides a safe space to test all Week 5 social features before production deployment. All social functionality should be thoroughly validated here before moving to Week 6.*