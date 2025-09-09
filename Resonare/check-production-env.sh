#!/bin/bash

echo "🔍 Production Environment Check"
echo "==============================="
echo ""

# Check if production env file exists
if [ -f ".env.production" ]; then
    echo "✅ .env.production file exists"
    echo ""
    echo "📄 Contents:"
    echo "============="
    cat .env.production | sed 's/SUPABASE_ANON_KEY=.*/SUPABASE_ANON_KEY=[HIDDEN]/' | sed 's/SPOTIFY_CLIENT_SECRET=.*/SPOTIFY_CLIENT_SECRET=[HIDDEN]/'
    echo ""
else
    echo "❌ .env.production file NOT found"
    echo ""
    echo "You need to create .env.production with:"
    echo "ENVIRONMENT=production"
    echo "SUPABASE_URL=https://your-prod-id.supabase.co"
    echo "SUPABASE_ANON_KEY=your_production_anon_key"
    echo "# ... other production config"
    echo ""
fi

# Check how to run production
echo "🚀 To run production environment:"
echo "ENVFILE=.env.production npm run ios"
echo ""

# Check current package.json scripts
echo "📦 Available npm scripts:"
echo "npm run ios          - Default (no environment specified)"
echo "npm run ios:dev      - Development environment"
echo "npm run ios:staging  - Staging environment"
echo ""
echo "For production, use: ENVFILE=.env.production npm run ios"
echo ""

# Production checklist
echo "✅ Production Setup Checklist:"
echo "[ ] Created production Supabase project"
echo "[ ] Created .env.production file"
echo "[ ] Configured Apple Sign-In in production Supabase"
echo "[ ] Configured Google Sign-In in production Supabase"
echo "[ ] Running app with ENVFILE=.env.production"
echo ""

echo "🔍 When app is running, check console for:"
echo "  '🔧 Current Environment: production'"
echo "  '[Production] Using production Supabase configuration'"