/**
 * Crash Analytics Service
 * Integrates Firebase Crashlytics for crash reporting and error tracking
 */
import { Environment } from '../config/environment';

// Conditional Firebase import to prevent issues in development
let crashlyticsInstance: any = null;
let crashlyticsModule: any = null;
let isFirebaseAvailable = false;

try {
  if (!Environment.isDevelopment) {
    crashlyticsModule = require('@react-native-firebase/crashlytics');
    // Use modular API: getCrashlytics() instead of crashlytics()
    crashlyticsInstance = crashlyticsModule.getCrashlytics();
    isFirebaseAvailable = true;
  }
} catch (error) {
  console.warn('[CrashAnalytics] Firebase not available:', error.message);
  isFirebaseAvailable = false;
}

export interface CrashAnalyticsService {
  initialize(): Promise<void>;
  recordError(error: Error, context?: Record<string, any>): void;
  recordNonFatalError(error: Error, context?: Record<string, any>): void;
  setUserId(userId: string): void;
  setUserAttributes(attributes: Record<string, string>): void;
  log(message: string): void;
  crash(): void; // For testing purposes only
}

class FirebaseCrashAnalytics implements CrashAnalyticsService {
  private isInitialized = false;

  async initialize(): Promise<void> {
    try {
      // In development, skip Firebase initialization entirely
      if (Environment.isDevelopment || !isFirebaseAvailable) {
        console.log(
          '[CrashAnalytics] Skipping Firebase initialization in development environment',
        );
        this.isInitialized = true;
        return;
      }

      // Enable crash collection for staging/production
      const shouldCollect = Environment.isStaging || Environment.isProduction;
      await crashlyticsModule.setCrashlyticsCollectionEnabled(
        crashlyticsInstance,
        shouldCollect,
      );

      if (shouldCollect) {
        // Set initial app info for production/staging
        crashlyticsModule.setAttributes(crashlyticsInstance, {
          environment: Environment.current,
          app_version: '1.0.0', // TODO: Get from package.json or build config
          build_type: Environment.current,
        });

        // Log successful initialization
        crashlyticsModule.log(crashlyticsInstance, 'Crashlytics initialized successfully');

        console.log(
          `[CrashAnalytics] Initialized for ${Environment.current} environment`,
        );
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('[CrashAnalytics] Failed to initialize:', error);
      // Don't throw in development - just log and continue
      if (Environment.isDevelopment || !isFirebaseAvailable) {
        console.warn('[CrashAnalytics] Continuing without crash analytics');
        this.isInitialized = true;
      } else {
        throw error;
      }
    }
  }

  recordError(error: Error, context?: Record<string, any>): void {
    if (
      !this.isInitialized ||
      !isFirebaseAvailable ||
      Environment.isDevelopment
    ) {
      console.log(
        '[CrashAnalytics] Would record error (disabled in development):',
        error.message,
        context,
      );
      return;
    }

    try {
      // Add context as custom keys
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          crashlyticsModule.setAttribute(
            crashlyticsInstance,
            key,
            String(value),
          );
        });
      }

      // Record the error
      crashlyticsModule.recordError(crashlyticsInstance, error);

      console.log('[CrashAnalytics] Recorded error:', error.message, context);
    } catch (recordingError) {
      console.error('[CrashAnalytics] Failed to record error:', recordingError);
    }
  }

  recordNonFatalError(error: Error, context?: Record<string, any>): void {
    if (
      !this.isInitialized ||
      !isFirebaseAvailable ||
      Environment.isDevelopment
    ) {
      console.log(
        '[CrashAnalytics] Would record non-fatal error (disabled in development):',
        error.message,
        context,
      );
      return;
    }

    try {
      // Add context
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          crashlyticsModule.setAttribute(
            crashlyticsInstance,
            key,
            String(value),
          );
        });
      }

      // Log the error context
      crashlyticsModule.log(
        crashlyticsInstance,
        `Non-fatal error: ${error.message}`,
      );

      // Record as non-fatal
      crashlyticsModule.recordError(crashlyticsInstance, error);

      console.log(
        '[CrashAnalytics] Recorded non-fatal error:',
        error.message,
        context,
      );
    } catch (recordingError) {
      console.error(
        '[CrashAnalytics] Failed to record non-fatal error:',
        recordingError,
      );
    }
  }

  setUserId(userId: string): void {
    if (
      !this.isInitialized ||
      !isFirebaseAvailable ||
      Environment.isDevelopment
    ) {
      console.log(
        '[CrashAnalytics] Would set user ID (disabled in development):',
        userId,
      );
      return;
    }

    try {
      crashlyticsModule.setUserId(crashlyticsInstance, userId);
      crashlyticsModule.log(crashlyticsInstance, `User ID set: ${userId}`);

      console.log('[CrashAnalytics] Set user ID:', userId);
    } catch (error) {
      console.error('[CrashAnalytics] Failed to set user ID:', error);
    }
  }

  setUserAttributes(attributes: Record<string, string>): void {
    if (
      !this.isInitialized ||
      !isFirebaseAvailable ||
      Environment.isDevelopment
    ) {
      console.log(
        '[CrashAnalytics] Would set user attributes (disabled in development):',
        attributes,
      );
      return;
    }

    try {
      crashlyticsModule.setAttributes(crashlyticsInstance, attributes);

      console.log('[CrashAnalytics] Set user attributes:', attributes);
    } catch (error) {
      console.error('[CrashAnalytics] Failed to set user attributes:', error);
    }
  }

  log(message: string): void {
    if (
      !this.isInitialized ||
      !isFirebaseAvailable ||
      Environment.isDevelopment
    ) {
      return;
    }

    try {
      crashlyticsModule.log(crashlyticsInstance, message);
    } catch (error) {
      console.error('[CrashAnalytics] Failed to log message:', error);
    }
  }

  crash(): void {
    if (!this.isInitialized || !isFirebaseAvailable) {
      console.warn(
        '[CrashAnalytics] Cannot trigger test crash - Firebase not available',
      );
      return;
    }

    if (Environment.isDevelopment) {
      console.warn(
        '[CrashAnalytics] Triggering test crash - this should only be used for testing!',
      );
      crashlyticsModule.crash(crashlyticsInstance);
    } else {
      console.warn(
        '[CrashAnalytics] Test crash disabled in non-development environments',
      );
    }
  }
}

// Mock implementation for development/testing
class MockCrashAnalytics implements CrashAnalyticsService {
  async initialize(): Promise<void> {
    console.log('[MockCrashAnalytics] Initialized (mock)');
  }

  recordError(error: Error, context?: Record<string, any>): void {
    console.log(
      '[MockCrashAnalytics] Would record error:',
      error.message,
      context,
    );
  }

  recordNonFatalError(error: Error, context?: Record<string, any>): void {
    console.log(
      '[MockCrashAnalytics] Would record non-fatal error:',
      error.message,
      context,
    );
  }

  setUserId(userId: string): void {
    console.log('[MockCrashAnalytics] Would set user ID:', userId);
  }

  setUserAttributes(attributes: Record<string, string>): void {
    console.log('[MockCrashAnalytics] Would set user attributes:', attributes);
  }

  log(message: string): void {
    console.log('[MockCrashAnalytics] Would log:', message);
  }

  crash(): void {
    console.log('[MockCrashAnalytics] Would trigger test crash');
  }
}

// Export singleton instance - use mock in development, real in production
export const crashAnalytics: CrashAnalyticsService = Environment.isDevelopment
  ? new MockCrashAnalytics()
  : new FirebaseCrashAnalytics();

// Export mock for testing
export const mockCrashAnalytics: CrashAnalyticsService =
  new MockCrashAnalytics();

// Convenience functions
export const initializeCrashAnalytics = () => crashAnalytics.initialize();
export const recordError = (error: Error, context?: Record<string, any>) =>
  crashAnalytics.recordError(error, context);
export const recordNonFatalError = (
  error: Error,
  context?: Record<string, any>,
) => crashAnalytics.recordNonFatalError(error, context);
export const setUserId = (userId: string) => crashAnalytics.setUserId(userId);
export const setUserAttributes = (attributes: Record<string, string>) =>
  crashAnalytics.setUserAttributes(attributes);
export const logMessage = (message: string) => crashAnalytics.log(message);

// Development testing function
export const triggerTestCrash = () => {
  if (Environment.isDevelopment) {
    console.warn(
      '⚠️ Test crash is only available in development with Firebase enabled',
    );
  } else {
    console.warn('Test crash is only available in development environment');
  }
};
