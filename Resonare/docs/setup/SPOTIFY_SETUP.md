# Spotify API Setup Guide

This guide will help you set up Spotify Web API integration for the Resonare app.

**Status**: ✅ **Production Ready** - Spotify API is integrated and active in production.

## Prerequisites

- A Spotify account (free or premium)
- Access to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)

## Step 1: Create a Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click **"Create an App"**
4. Fill in the app details:
   - **App name**: `Resonare Development` (or your preferred name)
   - **App description**: `Music discovery and rating app for iOS/Android`
   - **Website**: Leave blank or add your website
   - **Redirect URIs**: Not needed for Client Credentials flow
5. Check the boxes to agree to the terms
6. Click **"Create"**

## Step 2: Get Your API Credentials

1. In your newly created app dashboard, you'll see:
   - **Client ID**: A public identifier for your app
   - **Client Secret**: A secret key (keep this private!)
2. Click **"Show Client Secret"** to reveal the secret
3. Copy both the Client ID and Client Secret

## Step 3: Configure Environment Variables

1. In the Resonare project root, copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Open the `.env` file and add your Spotify credentials:
   ```bash
   SPOTIFY_CLIENT_ID=your_actual_client_id_here
   SPOTIFY_CLIENT_SECRET=your_actual_client_secret_here
   ```

3. Save the file

## Step 4: Test the Integration

1. Start the React Native development server:
   ```bash
   npm start
   ```

2. Run the app on iOS or Android:
   ```bash
   npm run ios
   # or
   npm run android
   ```

3. Try searching for albums or browsing popular albums
4. Check the console for any error messages

## Features Enabled

With Spotify API integration, the app now supports:

- ✅ **Real-time album search** - Search Spotify's entire catalog
- ✅ **Popular albums** - Discover trending and popular releases
- ✅ **Complete album metadata** - Track listings, release dates, genres
- ✅ **High-quality album artwork** - Multiple resolution images
- ✅ **Automatic fallback** - Falls back to mock data if API is unavailable

## Troubleshooting

### "Spotify API not configured" Message

- Check that your `.env` file exists and contains valid credentials
- Ensure the Client ID and Secret are correct (no extra spaces)
- Restart the development server after changing environment variables

### "Authentication failed" Error

- Verify your Client ID and Client Secret are correct
- Check that your Spotify app is not suspended or deleted
- Ensure you're using the Client Credentials flow (not Authorization Code)

### "Rate limited" Warnings

- The app automatically handles rate limiting with retries
- If you see frequent rate limit warnings, consider reducing search frequency
- Spotify allows 100 requests per second for Client Credentials flow

### No Search Results

- Try different search terms
- Check your internet connection
- The app will fall back to mock data if Spotify is unavailable

## API Limits

- **Free Tier**: 100 requests per second
- **Rate Limiting**: Automatically handled with exponential backoff
- **Data Usage**: Only public catalog data (no user data access)

## Security Notes

- Never commit your `.env` file to version control
- Keep your Client Secret private
- The Client Credentials flow only accesses public Spotify data
- No user authentication or personal data access

## Next Steps

Once Spotify integration is working:

1. **Week 4**: Implement user rating and listening history
2. **Week 5**: Add social features and user following
3. **Week 6**: Performance optimization and caching
4. **Week 7**: Production deployment preparation

## Support

If you encounter issues:

1. Check the [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api/)
2. Review the console logs for detailed error messages
3. Ensure your Spotify app settings are correct
4. Test with a simple API call using curl or Postman

## Example API Test

You can test your credentials directly with curl:

```bash
# Get access token
curl -X POST "https://accounts.spotify.com/api/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET"

# Search for albums (replace ACCESS_TOKEN with the token from above)
curl -X GET "https://api.spotify.com/v1/search?q=radiohead&type=album&limit=5" \
     -H "Authorization: Bearer ACCESS_TOKEN"
```

If these work, your credentials are correct and the issue might be in the app configuration.