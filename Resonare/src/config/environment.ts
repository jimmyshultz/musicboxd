/**
 * Environment Configuration
 * Handles different environments: development, staging, production
 */
import Config from 'react-native-config';

export type EnvironmentType = 'development' | 'staging' | 'production';

export const Environment = {
  // Determine current environment
  get current(): EnvironmentType {
    // Check environment variable from react-native-config
    const env = Config.ENVIRONMENT || 'development';
    if (env === 'production') return 'production';
    if (env === 'staging') return 'staging';
    return 'development';
  },

  // Environment checks
  get isDevelopment(): boolean {
    return this.current === 'development';
  },

  get isStaging(): boolean {
    return this.current === 'staging';
  },

  get isProduction(): boolean {
    return this.current === 'production';
  },

  // Get human-readable environment name
  getDisplayName(): string {
    switch (this.current) {
      case 'production':
        return 'Production';
      case 'staging':
        return 'Staging';
      case 'development':
      default:
        return 'Development';
    }
  },

  // Get environment-specific configuration
  getConfig() {
    return {
      environment: this.current,
      displayName: this.getDisplayName(),
      enableLogging: this.isDevelopment || this.isStaging,
      enableAnalytics: this.isStaging || this.isProduction,
      enableCrashReporting: this.isProduction,
      showEnvironmentBadge: this.isStaging,
    };
  },
};

// Logger utility for environment-aware logging
export const Logger = {
  log: (message: string, data?: any) => {
    if (Environment.isDevelopment || Environment.isStaging) {
      console.log(`[${Environment.getDisplayName()}] ${message}`, data);
    }
  },

  warn: (message: string, data?: any) => {
    if (Environment.isDevelopment || Environment.isStaging) {
      console.warn(`[${Environment.getDisplayName()}] ${message}`, data);
    }
  },

  error: (message: string, error?: any) => {
    console.error(`[${Environment.getDisplayName()}] ${message}`, error);

    // Send to crash reporting service
    if (Environment.isStaging || Environment.isProduction) {
      try {
        // Import dynamically to avoid circular dependencies
        import('../services/crashAnalytics').then(({ recordNonFatalError }) => {
          const errorObj = error instanceof Error ? error : new Error(message);
          recordNonFatalError(errorObj, {
            logger_message: message,
            environment: Environment.current,
            timestamp: new Date().toISOString(),
          });
        });
      } catch {
        // Fail silently if crash analytics is not available
      }
    }
  },

  debug: (message: string, data?: any) => {
    if (Environment.isDevelopment) {
      console.debug(
        `[${Environment.getDisplayName()}] DEBUG: ${message}`,
        data,
      );
    }
  },
};

// Development utilities
export const DevUtils = {
  // Show environment badge in staging
  shouldShowEnvironmentBadge(): boolean {
    return Environment.isStaging;
  },

  // Get badge text
  getEnvironmentBadgeText(): string {
    return Environment.getDisplayName().toUpperCase();
  },

  // Development menu options
  getDevMenuOptions() {
    if (!Environment.isDevelopment) return [];

    return [
      'Clear AsyncStorage',
      'Reset to Onboarding',
      'Mock Data Generator',
      'API Test Console',
      'Performance Monitor',
    ];
  },
};
