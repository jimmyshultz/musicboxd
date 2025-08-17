# Musicboxd Deployment Guide
> Environment Setup & Production Deployment Strategy

## 🎯 **Deployment Overview**

This guide outlines the deployment strategy for Musicboxd from development to production, including environment configurations, deployment pipelines, and operational procedures.

### **Deployment Goals**
- ✅ **Zero-downtime deployments** for production updates
- ✅ **Cost-effective** infrastructure using managed services
- ✅ **Environment parity** across development, staging, and production
- ✅ **Automated** testing and deployment processes
- ✅ **Monitoring** and alerting for all environments

---

## 🌍 **Environment Strategy**

### **Environment Timeline**
```
Week 1-4:  Development Only
Week 5-6:  Development + Staging
Week 7+:   Development + Staging + Production
```

### **Environment Configuration Matrix**

| Environment | Purpose | Users | Data | Deployment | Monitoring |
|-------------|---------|-------|------|------------|------------|
| **Development** | Local development | 1 developer | Mock/test data | Manual local | Console logs |
| **Staging** | Pre-production testing | Internal team | Production-like | Auto from `staging` branch | Basic monitoring |
| **Production** | Live user app | Beta users (10-20) | Real user data | Manual from `main` branch | Full monitoring |

---

## 🏗 **Infrastructure Architecture**

### **Development Environment**
```yaml
Development Setup:
  Frontend:
    - React Native with Metro bundler
    - Local iOS simulator / Android emulator
    - Hot reload enabled
    - Redux DevTools
    
  Backend:
    - Supabase project: "musicboxd-dev"
    - Local environment variables
    - Mock Spotify data for offline development
    - Database: PostgreSQL (free tier)
    
  External APIs:
    - Spotify API (development credentials)
    - No rate limiting concerns
```

### **Staging Environment**
```yaml
Staging Setup:
  Frontend:
    - TestFlight internal testing builds
    - Production-like build configuration
    - No development tools included
    
  Backend:
    - Supabase project: "musicboxd-staging"
    - Separate database with production schema
    - Real Spotify API integration
    - Environment-specific secrets
    
  Data:
    - Sanitized production data (optional)
    - Test user accounts
    - Limited album cache for testing
    
  Purpose:
    - Final QA testing
    - Performance testing
    - Integration testing
    - Stakeholder demos
```

### **Production Environment**
```yaml
Production Setup:
  Frontend:
    - TestFlight external testing (beta users)
    - Optimized production builds
    - Error reporting enabled
    - Analytics tracking
    
  Backend:
    - Supabase project: "musicboxd-prod"
    - Production database with backups
    - Full Spotify API integration
    - Security monitoring enabled
    
  Data:
    - Real user data
    - GDPR compliance measures
    - Automated backups
    - Data retention policies
    
  Infrastructure:
    - CDN for album artwork
    - Error monitoring (Supabase + custom)
    - Performance monitoring
    - Uptime monitoring
```

---

## 🛠 **Supabase Project Setup**

### **Development Environment Setup**
```bash
# 1. Create Supabase account and development project
# 2. Save configuration to .env.development

# .env.development
SUPABASE_URL=https://your-dev-project.supabase.co
SUPABASE_ANON_KEY=your-dev-anon-key
SPOTIFY_CLIENT_ID=your-dev-spotify-client-id
ENVIRONMENT=development
```

### **Database Schema Deployment**
```sql
-- Run in Supabase SQL Editor for each environment

-- 1. Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create albums table
CREATE TABLE albums (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  artist_id TEXT,
  image_url TEXT,
  release_date DATE,
  popularity INTEGER DEFAULT 0,
  track_count INTEGER,
  duration_ms INTEGER,
  genres TEXT[],
  spotify_data JSONB,
  musicbrainz_id TEXT,
  cache_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create user_albums table
CREATE TABLE user_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  album_id TEXT REFERENCES albums(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('listened', 'want_to_listen', 'currently_listening')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  listened_at DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, album_id)
);

-- 4. Create follows table
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- 5. Create activities table
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  album_id TEXT REFERENCES albums(id) ON DELETE CASCADE,
  activity_type TEXT CHECK (activity_type IN ('rated', 'listened', 'reviewed')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create indexes for performance
CREATE INDEX albums_name_search ON albums USING gin(to_tsvector('english', name));
CREATE INDEX albums_artist_search ON albums USING gin(to_tsvector('english', artist_name));
CREATE INDEX albums_popularity ON albums (popularity DESC);
CREATE INDEX user_albums_user_listened ON user_albums (user_id, listened_at DESC);
CREATE INDEX user_albums_user_rating ON user_albums (user_id, rating DESC) WHERE rating IS NOT NULL;
CREATE INDEX follows_follower ON follows (follower_id);
CREATE INDEX follows_following ON follows (following_id);
CREATE INDEX activities_user_time ON activities (user_id, created_at DESC);
CREATE INDEX activities_feed_time ON activities (created_at DESC);

-- 7. Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies
CREATE POLICY users_update_own ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY user_albums_own ON user_albums FOR ALL USING (auth.uid() = user_id);
CREATE POLICY follows_own ON follows FOR ALL USING (auth.uid() = follower_id);
CREATE POLICY activities_visible ON activities FOR SELECT USING (
  auth.uid() = user_id OR
  (
    EXISTS (SELECT 1 FROM users WHERE id = activities.user_id AND is_public = true) AND
    EXISTS (SELECT 1 FROM follows WHERE following_id = activities.user_id AND follower_id = auth.uid())
  )
);
```

### **Authentication Setup**
```javascript
// Configure OAuth providers in Supabase Dashboard
// Authentication > Providers

// Google OAuth Configuration:
// 1. Go to Google Cloud Console
// 2. Create OAuth 2.0 client ID
// 3. Add redirect URI: https://your-project.supabase.co/auth/v1/callback
// 4. Copy Client ID and Secret to Supabase

// Apple OAuth Configuration:
// 1. Go to Apple Developer Console
// 2. Create App ID and Services ID
// 3. Configure Sign in with Apple
// 4. Add redirect URI: https://your-project.supabase.co/auth/v1/callback
// 5. Copy credentials to Supabase
```

---

## 📱 **Mobile App Deployment**

### **iOS Development Setup**
```bash
# 1. Install dependencies
cd Musicboxd
npm install
cd ios && pod install && cd ..

# 2. Configure signing in Xcode
# - Open ios/Musicboxd.xcworkspace
# - Select project > Signing & Capabilities
# - Set Team and Bundle Identifier

# 3. Run development build
npm run ios
```

### **iOS TestFlight Deployment**

#### **Development Build (Internal Testing)**
```bash
# 1. Update version number
# In ios/Musicboxd/Info.plist:
# CFBundleShortVersionString: 1.0.0
# CFBundleVersion: 1

# 2. Create archive build
xcodebuild -workspace ios/Musicboxd.xcworkspace \
  -scheme Musicboxd \
  -configuration Release \
  -archivePath build/Musicboxd.xcarchive \
  archive

# 3. Export for App Store distribution
xcodebuild -exportArchive \
  -archivePath build/Musicboxd.xcarchive \
  -exportPath build \
  -exportOptionsPlist ios/ExportOptions.plist

# 4. Upload to App Store Connect
xcrun altool --upload-app \
  --type ios \
  --file build/Musicboxd.ipa \
  --username your-apple-id \
  --password your-app-specific-password
```

#### **Staging Build (External Testing)**
```bash
# Same process as development but with:
# - Staging environment configuration
# - Different bundle identifier (com.musicboxd.staging)
# - External tester groups in TestFlight
```

#### **Production Build (Beta Release)**
```bash
# Same process but with:
# - Production environment configuration
# - Final bundle identifier (com.musicboxd.app)
# - Full external testing group
```

---

## 🚀 **Deployment Pipeline**

### **Manual Deployment Process (Initial)**

#### **Week 1-4: Development Only**
```bash
# Local development workflow
git checkout -b feature/user-auth
# ... make changes ...
git commit -m "Add user authentication"
git push origin feature/user-auth
# Create PR to main
# Manual testing locally
```

#### **Week 5-6: Add Staging**
```bash
# Staging deployment workflow
git checkout staging
git merge main
git push origin staging

# Deploy to staging environment:
# 1. Update environment variables
# 2. Test with staging Supabase project
# 3. Create TestFlight internal build
# 4. Test all features manually
```

#### **Week 7+: Add Production**
```bash
# Production deployment workflow
git checkout main
git merge staging  # After staging validation
git tag v1.0.0-beta.1
git push origin main --tags

# Deploy to production:
# 1. Update environment variables to production
# 2. Create production TestFlight build
# 3. Distribute to beta testers
# 4. Monitor for issues
```

### **Environment Variable Management**

#### **Development (.env.development)**
```bash
SUPABASE_URL=https://dev-project.supabase.co
SUPABASE_ANON_KEY=dev-anon-key
SPOTIFY_CLIENT_ID=dev-spotify-client-id
ENVIRONMENT=development
API_BASE_URL=https://dev-project.supabase.co/rest/v1
ENABLE_REDUX_DEVTOOLS=true
LOG_LEVEL=debug
```

#### **Staging (.env.staging)**
```bash
SUPABASE_URL=https://staging-project.supabase.co
SUPABASE_ANON_KEY=staging-anon-key
SPOTIFY_CLIENT_ID=staging-spotify-client-id
ENVIRONMENT=staging
API_BASE_URL=https://staging-project.supabase.co/rest/v1
ENABLE_REDUX_DEVTOOLS=false
LOG_LEVEL=info
```

#### **Production (.env.production)**
```bash
SUPABASE_URL=https://prod-project.supabase.co
SUPABASE_ANON_KEY=prod-anon-key
SPOTIFY_CLIENT_ID=prod-spotify-client-id
ENVIRONMENT=production
API_BASE_URL=https://prod-project.supabase.co/rest/v1
ENABLE_REDUX_DEVTOOLS=false
LOG_LEVEL=error
ANALYTICS_ENABLED=true
ERROR_REPORTING_ENABLED=true
```

---

## 📊 **Monitoring & Observability**

### **Application Monitoring**

#### **Development Monitoring**
```typescript
// Basic console logging
const logger = {
  debug: (message: string, data?: any) => {
    if (__DEV__) {
      console.log(`[DEBUG] ${message}`, data);
    }
  },
  error: (message: string, error?: Error) => {
    console.error(`[ERROR] ${message}`, error);
  }
};
```

#### **Staging & Production Monitoring**
```typescript
// Enhanced logging and error tracking
class MonitoringService {
  static trackError(error: Error, context?: Record<string, any>) {
    // Log to Supabase and external service
    supabase.functions.invoke('log-error', {
      body: {
        message: error.message,
        stack: error.stack,
        context,
        environment: process.env.ENVIRONMENT,
        timestamp: new Date().toISOString(),
        userId: getCurrentUserId(),
      }
    });
  }

  static trackPerformance(metric: string, duration: number, tags?: Record<string, string>) {
    supabase.functions.invoke('track-performance', {
      body: {
        metric,
        duration,
        tags,
        environment: process.env.ENVIRONMENT,
        timestamp: new Date().toISOString(),
      }
    });
  }

  static trackUserAction(action: string, properties?: Record<string, any>) {
    if (process.env.ANALYTICS_ENABLED === 'true') {
      supabase.functions.invoke('track-event', {
        body: {
          action,
          properties,
          userId: getCurrentUserId(),
          environment: process.env.ENVIRONMENT,
          timestamp: new Date().toISOString(),
        }
      });
    }
  }
}
```

### **Database Monitoring**
```sql
-- Key metrics to monitor in Supabase Dashboard

-- 1. User growth
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as new_users
FROM users 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date;

-- 2. Album interaction metrics
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as albums_rated,
  AVG(rating) as avg_rating
FROM user_albums 
WHERE rating IS NOT NULL
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date;

-- 3. Social engagement
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as new_follows
FROM follows 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date;

-- 4. Performance monitoring
SELECT 
  activity_type,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_duration_seconds
FROM activities
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY activity_type;
```

### **Alert Configuration**
```yaml
# Monitoring alerts to set up

Critical Alerts:
  - App crash rate > 5%
  - API response time > 2 seconds
  - Database connection failures
  - Authentication failures > 10%

Warning Alerts:
  - User retention drops below 50%
  - Search response time > 1 second
  - Spotify API rate limit approaching
  - Storage usage > 80% of quota

Information Alerts:
  - Daily user growth metrics
  - Feature usage statistics
  - Performance trend reports
```

---

## 🔒 **Security & Compliance**

### **Environment Security Checklist**

#### **Development Environment**
- [ ] Use development API keys only
- [ ] No production data access
- [ ] Local storage of sensitive data
- [ ] Development-only debugging enabled

#### **Staging Environment**
- [ ] Separate database from production
- [ ] Production-like security settings
- [ ] Limited access to test team only
- [ ] Test data only (no real user data)

#### **Production Environment**
- [ ] Production API keys and secrets
- [ ] HTTPS/TLS encryption enabled
- [ ] Row Level Security enabled
- [ ] Regular security audits
- [ ] GDPR compliance measures
- [ ] Data backup and retention policies
- [ ] Access logging and monitoring

### **Secrets Management**
```typescript
// Environment variable validation
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SPOTIFY_CLIENT_ID'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});

// Secure configuration loading
const config = {
  supabase: {
    url: process.env.SUPABASE_URL!,
    anonKey: process.env.SUPABASE_ANON_KEY!,
  },
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID!,
  },
  environment: process.env.ENVIRONMENT as 'development' | 'staging' | 'production',
};
```

---

## 📈 **Scaling Considerations**

### **Performance Optimization by Environment**

#### **Development**
- Fast iteration and debugging
- No performance optimization needed
- Full logging and debugging tools

#### **Staging**
- Production-like performance testing
- Load testing with simulated users
- Performance profiling enabled

#### **Production**
- Optimized builds and assets
- CDN for static content
- Database query optimization
- Caching strategies implemented

### **Cost Management**
```yaml
# Cost monitoring by environment

Development:
  - Supabase: Free tier
  - Spotify API: Free tier
  - Apple Developer: $99/year
  - Total: ~$8.25/month

Staging:
  - Supabase: Free tier (separate project)
  - Additional testing costs: Minimal
  - Total: +$0/month

Production:
  - Supabase: Free tier initially, Pro tier as needed ($25/month)
  - CDN: Cloudflare free tier
  - Monitoring: Built into Supabase
  - Total: $9.25-34.25/month based on usage
```

---

## 🚨 **Disaster Recovery**

### **Backup Strategy**
```sql
-- Automated backups in Supabase (Pro tier)
-- Daily backups with 7-day retention
-- Point-in-time recovery available

-- Manual backup for critical data
pg_dump -h your-host -U your-user -d your-database > backup_$(date +%Y%m%d).sql
```

### **Rollback Procedures**
```bash
# Mobile app rollback
# 1. Disable latest TestFlight build
# 2. Re-enable previous stable build
# 3. Notify users through in-app messaging

# Database rollback
# 1. Stop application traffic
# 2. Restore from last known good backup
# 3. Run data integrity checks
# 4. Resume application traffic
```

### **Incident Response**
```yaml
# Incident response playbook

Severity 1 (Critical):
  - App completely down or data loss
  - Response time: < 15 minutes
  - Actions: Immediate rollback, all-hands investigation

Severity 2 (Major):
  - Core features broken
  - Response time: < 1 hour
  - Actions: Hotfix deployment, user communication

Severity 3 (Minor):
  - Non-critical features affected
  - Response time: < 4 hours
  - Actions: Scheduled fix, internal communication
```

---

## 📋 **Deployment Checklist**

### **Pre-Deployment Checklist**
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Security audit completed
- [ ] Performance testing completed
- [ ] Backup procedures verified

### **Deployment Checklist**
- [ ] Deploy to staging first
- [ ] Validate all features in staging
- [ ] Create production build
- [ ] Upload to TestFlight
- [ ] Monitor error rates
- [ ] Verify user analytics

### **Post-Deployment Checklist**
- [ ] Monitor key metrics for 24 hours
- [ ] Check error rates and performance
- [ ] Verify user feedback
- [ ] Update documentation
- [ ] Plan next iteration

---

*This deployment guide will be updated as we implement each environment and learn from operational experience. All procedures should be tested in staging before production deployment.*