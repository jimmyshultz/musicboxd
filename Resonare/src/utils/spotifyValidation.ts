// Spotify API integration validation utilities
import { SpotifyService } from '../services/spotifyService';
import { SPOTIFY_CONFIG } from '../config/spotify';

export interface ValidationResult {
  step: string;
  success: boolean;
  message: string;
  details?: any;
}

export interface SpotifyValidationReport {
  overall: boolean;
  results: ValidationResult[];
  recommendations: string[];
}

/**
 * Comprehensive validation of Spotify API integration
 */
export async function validateSpotifyIntegration(): Promise<SpotifyValidationReport> {
  const results: ValidationResult[] = [];
  const recommendations: string[] = [];

  // Step 1: Check configuration
  results.push(validateConfiguration());

  // Step 2: Test authentication (only if configured)
  if (SpotifyService.isConfigured()) {
    try {
      const authResult = await testAuthentication();
      results.push(authResult);
    } catch (error) {
      results.push({
        step: 'Authentication Test',
        success: false,
        message: 'Authentication failed',
        details: error,
      });
    }

    // Step 3: Test search functionality (only if auth succeeded)
    const authSuccess = results.find(
      r => r.step === 'Authentication Test',
    )?.success;
    if (authSuccess) {
      try {
        const searchResult = await testSearch();
        results.push(searchResult);
      } catch (error) {
        results.push({
          step: 'Search Test',
          success: false,
          message: 'Search test failed',
          details: error,
        });
      }

      // Step 4: Test album details
      try {
        const albumResult = await testAlbumDetails();
        results.push(albumResult);
      } catch (error) {
        results.push({
          step: 'Album Details Test',
          success: false,
          message: 'Album details test failed',
          details: error,
        });
      }
    }
  } else {
    recommendations.push('Set up Spotify API credentials in .env file');
    recommendations.push('Follow the setup guide in SPOTIFY_SETUP.md');
  }

  // Generate recommendations based on results
  generateRecommendations(results, recommendations);

  const overall = results.every(r => r.success);

  return {
    overall,
    results,
    recommendations,
  };
}

/**
 * Validate Spotify configuration
 */
function validateConfiguration(): ValidationResult {
  const hasClientId =
    SPOTIFY_CONFIG.CLIENT_ID &&
    SPOTIFY_CONFIG.CLIENT_ID !== 'your_spotify_client_id';
  const hasClientSecret =
    SPOTIFY_CONFIG.CLIENT_SECRET &&
    SPOTIFY_CONFIG.CLIENT_SECRET !== 'your_spotify_client_secret';

  if (hasClientId && hasClientSecret) {
    return {
      step: 'Configuration Check',
      success: true,
      message: 'Spotify credentials are configured',
    };
  }

  const missing = [];
  if (!hasClientId) missing.push('SPOTIFY_CLIENT_ID');
  if (!hasClientSecret) missing.push('SPOTIFY_CLIENT_SECRET');

  return {
    step: 'Configuration Check',
    success: false,
    message: `Missing configuration: ${missing.join(', ')}`,
    details: { missing, configured: SpotifyService.isConfigured() },
  };
}

/**
 * Test Spotify authentication
 */
async function testAuthentication(): ValidationResult {
  try {
    // This will trigger authentication internally
    await SpotifyService.searchAlbums('test', 1);

    return {
      step: 'Authentication Test',
      success: true,
      message: 'Successfully authenticated with Spotify API',
    };
  } catch (error: any) {
    if (error.message?.includes('Authentication failed')) {
      return {
        step: 'Authentication Test',
        success: false,
        message: 'Invalid Spotify credentials',
        details: 'Check your Client ID and Client Secret',
      };
    }

    return {
      step: 'Authentication Test',
      success: false,
      message: 'Authentication test failed',
      details: error.message,
    };
  }
}

/**
 * Test search functionality
 */
async function testSearch(): ValidationResult {
  try {
    const response = await SpotifyService.searchAlbums(
      'radiohead ok computer',
      5,
    );

    if (!response.albums?.items || response.albums.items.length === 0) {
      return {
        step: 'Search Test',
        success: false,
        message: 'Search returned no results',
        details: 'This might indicate API issues or filtering problems',
      };
    }

    return {
      step: 'Search Test',
      success: true,
      message: `Search successful - found ${response.albums.items.length} albums`,
      details: {
        query: 'radiohead ok computer',
        resultCount: response.albums.items.length,
        firstResult: response.albums.items[0]?.name,
      },
    };
  } catch (error: any) {
    return {
      step: 'Search Test',
      success: false,
      message: 'Search test failed',
      details: error.message,
    };
  }
}

/**
 * Test album details functionality
 */
async function testAlbumDetails(): ValidationResult {
  try {
    // First get an album ID from search
    const searchResponse = await SpotifyService.searchAlbums(
      'radiohead ok computer',
      1,
    );

    if (
      !searchResponse.albums?.items ||
      searchResponse.albums.items.length === 0
    ) {
      return {
        step: 'Album Details Test',
        success: false,
        message: 'Could not find test album for details test',
      };
    }

    const albumId = searchResponse.albums.items[0].id;
    const albumDetails = await SpotifyService.getAlbum(albumId);

    if (!albumDetails || !albumDetails.name) {
      return {
        step: 'Album Details Test',
        success: false,
        message: 'Album details request returned invalid data',
      };
    }

    return {
      step: 'Album Details Test',
      success: true,
      message: `Album details successful - ${albumDetails.name}`,
      details: {
        albumId,
        albumName: albumDetails.name,
        trackCount: albumDetails.total_tracks,
        hasImages: albumDetails.images.length > 0,
      },
    };
  } catch (error: any) {
    return {
      step: 'Album Details Test',
      success: false,
      message: 'Album details test failed',
      details: error.message,
    };
  }
}

/**
 * Generate recommendations based on validation results
 */
function generateRecommendations(
  results: ValidationResult[],
  recommendations: string[],
): void {
  const failedSteps = results.filter(r => !r.success);

  if (failedSteps.length === 0) {
    recommendations.push('✅ Spotify integration is working correctly!');
    recommendations.push('You can now use real Spotify data in the app');
    return;
  }

  // Configuration issues
  const configFailed = failedSteps.find(r => r.step === 'Configuration Check');
  if (configFailed) {
    recommendations.push(
      '1. Create a Spotify app at https://developer.spotify.com/dashboard',
    );
    recommendations.push(
      '2. Copy .env.example to .env and add your credentials',
    );
    recommendations.push('3. Restart the development server');
  }

  // Authentication issues
  const authFailed = failedSteps.find(r => r.step === 'Authentication Test');
  if (authFailed && !configFailed) {
    recommendations.push(
      '1. Verify your Spotify Client ID and Secret are correct',
    );
    recommendations.push(
      '2. Check that your Spotify app is active (not suspended)',
    );
    recommendations.push(
      '3. Test credentials with curl (see SPOTIFY_SETUP.md)',
    );
  }

  // API issues
  const apiFailed = failedSteps.filter(
    r => r.step.includes('Test') && r.step !== 'Authentication Test',
  );
  if (apiFailed.length > 0 && !configFailed && !authFailed) {
    recommendations.push('1. Check your internet connection');
    recommendations.push('2. Verify Spotify API is not experiencing outages');
    recommendations.push('3. Check console for detailed error messages');
  }

  // Fallback recommendation
  if (recommendations.length === 0) {
    recommendations.push(
      'Check the console logs for detailed error information',
    );
    recommendations.push('Refer to SPOTIFY_SETUP.md for troubleshooting steps');
  }
}

/**
 * Quick validation check for Spotify configuration
 */
export function quickValidation(): { configured: boolean; message: string } {
  const configured = SpotifyService.isConfigured();

  return {
    configured,
    message: configured
      ? 'Spotify API configured'
      : 'Spotify API not configured - using fallback data',
  };
}

/**
 * Print validation report to console
 */
export function printValidationReport(report: SpotifyValidationReport): void {
  console.log('\n🎵 Spotify API Validation Report');
  console.log('================================');

  report.results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.step}: ${result.message}`);
    if (result.details && !result.success) {
      console.log(`   Details:`, result.details);
    }
  });

  console.log('\n📋 Recommendations:');
  report.recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec}`);
  });

  console.log(
    `\nOverall Status: ${report.overall ? '✅ PASSED' : '❌ NEEDS ATTENTION'}`,
  );
  console.log('================================\n');
}
