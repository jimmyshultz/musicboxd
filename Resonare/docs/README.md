# Resonare Documentation

Welcome to the Resonare documentation! This directory contains comprehensive documentation for developers, contributors, and users.

**Status**: ✅ **In Production** - App is live on Apple App Store

---

## 📚 Documentation Index

### Getting Started
- **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** - Complete developer onboarding guide
  - Quick start instructions
  - Project structure
  - Architecture overview
  - Development workflow
  - Common tasks

### Production Information
- **[PRODUCTION_FEATURES.md](./PRODUCTION_FEATURES.md)** - Complete list of production features
  - All implemented features
  - Database schema
  - Services and integrations
  - Known limitations

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment and release procedures
  - Build process
  - App Store submission
  - Release management
  - Monitoring and maintenance

### Setup Guides
All setup guides are organized in the [`setup/`](./setup/) directory:
- **[setup/SPOTIFY_SETUP.md](./setup/SPOTIFY_SETUP.md)** - Spotify API integration
- **[setup/ADMOB_SETUP.md](./setup/ADMOB_SETUP.md)** - AdMob monetization setup
- **[setup/CRASH_ANALYTICS_SETUP.md](./setup/CRASH_ANALYTICS_SETUP.md)** - Firebase Crashlytics setup
- **[setup/MODERATION_SETUP.md](./setup/MODERATION_SETUP.md)** - Content moderation setup
  - Database tables
  - Email notifications
  - Admin tools
  - Response time requirements

### Feature Documentation
- **[features/INSTAGRAM_PRIVACY_MODEL.md](./features/INSTAGRAM_PRIVACY_MODEL.md)** - Privacy model implementation
- **[features/HOME_PAGE_SOCIAL_FEATURES.md](./features/HOME_PAGE_SOCIAL_FEATURES.md)** - Home page social features
- **[features/ARTIST_DETAILS_IMPLEMENTATION.md](./features/ARTIST_DETAILS_IMPLEMENTATION.md)** - Artist details feature
- **[features/DIARY_ENTRY_REVIEW.md](./features/DIARY_ENTRY_REVIEW.md)** - Diary and review system (complete documentation)

### Technical Decisions
- **[decisions/DATABASE_SCHEMA_V2_MIGRATION.md](./decisions/DATABASE_SCHEMA_V2_MIGRATION.md)** - Database schema migration
- **[decisions/ACTIVITY_FEED_REMOVAL_DECISION.md](./decisions/ACTIVITY_FEED_REMOVAL_DECISION.md)** - Architecture decision

### Historical Documentation
- **[archive/README.md](./archive/README.md)** - Archive documentation index
  - Historical fixes and implementations
  - Development process documentation
  - Reference material

---

## 🚀 Quick Links

### For New Developers
1. Start with [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)
2. Review [PRODUCTION_FEATURES.md](./PRODUCTION_FEATURES.md) for feature overview
3. Check setup guides in [`setup/`](./setup/) directory:
   - [setup/SPOTIFY_SETUP.md](./setup/SPOTIFY_SETUP.md)
   - [setup/ADMOB_SETUP.md](./setup/ADMOB_SETUP.md)
   - [setup/CRASH_ANALYTICS_SETUP.md](./setup/CRASH_ANALYTICS_SETUP.md)
   - [setup/MODERATION_SETUP.md](./setup/MODERATION_SETUP.md)

### For Deployment
1. Review [DEPLOYMENT.md](./DEPLOYMENT.md)
2. Check environment configuration
3. Follow App Store submission process

### For Feature Development
1. Review relevant feature documentation in `features/`
2. Check technical decisions in `decisions/`
3. Reference archive for historical context if needed

---

## 📖 Documentation Structure

```
docs/
├── README.md (this file)
├── DEVELOPER_GUIDE.md
├── PRODUCTION_FEATURES.md
├── DEPLOYMENT.md
├── setup/
│   ├── SPOTIFY_SETUP.md
│   ├── ADMOB_SETUP.md
│   ├── CRASH_ANALYTICS_SETUP.md
│   └── MODERATION_SETUP.md
├── features/
│   ├── INSTAGRAM_PRIVACY_MODEL.md
│   ├── HOME_PAGE_SOCIAL_FEATURES.md
│   ├── ARTIST_DETAILS_IMPLEMENTATION.md
│   └── DIARY_ENTRY_REVIEW.md
├── decisions/
│   ├── DATABASE_SCHEMA_V2_MIGRATION.md
│   └── ACTIVITY_FEED_REMOVAL_DECISION.md
└── archive/
    ├── README.md
    └── (historical documentation)
```

---

## 🔍 Finding Information

### By Topic

**Authentication & Users**
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Architecture section
- [PRODUCTION_FEATURES.md](./PRODUCTION_FEATURES.md) - Authentication section

**Database & Backend**
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Database section
- [PRODUCTION_FEATURES.md](./PRODUCTION_FEATURES.md) - Database schema
- [decisions/DATABASE_SCHEMA_V2_MIGRATION.md](./decisions/DATABASE_SCHEMA_V2_MIGRATION.md)

**Social Features**
- [features/INSTAGRAM_PRIVACY_MODEL.md](./features/INSTAGRAM_PRIVACY_MODEL.md)
- [features/HOME_PAGE_SOCIAL_FEATURES.md](./features/HOME_PAGE_SOCIAL_FEATURES.md)
- [PRODUCTION_FEATURES.md](./PRODUCTION_FEATURES.md) - Social Features section

**Content Moderation**
- [setup/MODERATION_SETUP.md](./setup/MODERATION_SETUP.md)
- [PRODUCTION_FEATURES.md](./PRODUCTION_FEATURES.md) - Content Moderation section

**Deployment**
- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Development Workflow section

---

## 📝 Documentation Standards

### Status Indicators
- ✅ **Implemented** - Feature is complete and active
- 🔄 **In Progress** - Feature is being developed
- 📋 **Planned** - Feature is planned for future
- ⏸️ **Deferred** - Feature deferred to later release

### Code Examples
All code examples use:
- TypeScript
- React Native patterns
- Current project structure

### Links
- Internal links use relative paths
- External links are clearly marked
- All links are verified

---

## 🤝 Contributing to Documentation

When updating documentation:
1. Keep information current and accurate
2. Update status indicators as needed
3. Add links to related documentation
4. Follow existing formatting and structure
5. Update this README if adding new documents

---

## 📞 Getting Help

If you can't find what you're looking for:
1. Check the main [README.md](../README.md)
2. Review [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)
3. Search the codebase for implementation details
4. Check archive for historical context

---

**Last Updated**: Post-Launch Documentation Review
