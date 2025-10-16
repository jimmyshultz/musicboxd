/**
 * Crash Analytics Service
 * Integrates Firebase Crashlytics for crash reporting and error tracking
 */
import crashlytics from '@react-native-firebase/crashlytics';
import { Environment } from '../config/environment';

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
      // Enable crash collection based on environment
      const shouldCollect = Environment.isStaging || Environment.isProduction;
      
      // Always initialize Firebase, but disable collection in development
      await crashlytics().setCrashlyticsCollectionEnabled(shouldCollect);
      
      if (shouldCollect) {
        // Set initial app info for production/staging
        crashlytics().setAttributes({
          environment: Environment.current,
          app_version: '1.0.0', // TODO: Get from package.json or build config
          build_type: Environment.current,
        });

        // Log successful initialization
        crashlytics().log('Crashlytics initialized successfully');
        
        console.log(`[CrashAnalytics] Initialized for ${Environment.current} environment`);
      } else {
        console.log('[CrashAnalytics] Initialized but disabled in development environment');
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('[CrashAnalytics] Failed to initialize:', error);
      // Don't throw in development - just log and continue
      if (Environment.isDevelopment) {
        console.warn('[CrashAnalytics] Continuing without crash analytics in development');
        this.isInitialized = true;
      } else {
        throw error;
      }
    }
  }

  recordError(error: Error, context?: Record<string, any>): void {
    if (!this.isInitialized) {
      console.warn('[CrashAnalytics] Not initialized, skipping error recording');
      return;
    }

    try {
      // Add context as custom keys
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          crashlytics().setAttribute(key, String(value));
        });
      }

      // Record the error
      crashlytics().recordError(error);
      
      // Log for development
      if (Environment.isDevelopment) {
        console.log('[CrashAnalytics] Recorded error:', error.message, context);
      }
    } catch (recordingError) {
      console.error('[CrashAnalytics] Failed to record error:', recordingError);
    }
  }

  recordNonFatalError(error: Error, context?: Record<string, any>): void {
    if (!this.isInitialized) {
      console.warn('[CrashAnalytics] Not initialized, skipping non-fatal error recording');
      return;
    }

    try {
      // Add context
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          crashlytics().setAttribute(key, String(value));
        });
      }

      // Log the error context
      crashlytics().log(`Non-fatal error: ${error.message}`);
      
      // Record as non-fatal
      crashlytics().recordError(error);
      
      if (Environment.isDevelopment) {
        console.log('[CrashAnalytics] Recorded non-fatal error:', error.message, context);
      }
    } catch (recordingError) {
      console.error('[CrashAnalytics] Failed to record non-fatal error:', recordingError);
    }
  }

  setUserId(userId: string): void {
    if (!this.isInitialized) {
      console.warn('[CrashAnalytics] Not initialized, skipping user ID setting');
      return;
    }

    try {
      crashlytics().setUserId(userId);
      crashlytics().log(`User ID set: ${userId}`);
      
      if (Environment.isDevelopment) {
        console.log('[CrashAnalytics] Set user ID:', userId);
      }
    } catch (error) {
      console.error('[CrashAnalytics] Failed to set user ID:', error);
    }
  }

  setUserAttributes(attributes: Record<string, string>): void {
    if (!this.isInitialized) {
      console.warn('[CrashAnalytics] Not initialized, skipping user attributes');
      return;
    }

    try {
      crashlytics().setAttributes(attributes);
      
      if (Environment.isDevelopment) {
        console.log('[CrashAnalytics] Set user attributes:', attributes);
      }
    } catch (error) {
      console.error('[CrashAnalytics] Failed to set user attributes:', error);
    }
  }

  log(message: string): void {
    if (!this.isInitialized) {
      return;
    }

    try {
      crashlytics().log(message);
    } catch (error) {
      console.error('[CrashAnalytics] Failed to log message:', error);
    }
  }

  crash(): void {
    if (!this.isInitialized) {
      console.warn('[CrashAnalytics] Not initialized, cannot trigger test crash');
      return;
    }

    if (Environment.isDevelopment) {
      console.warn('[CrashAnalytics] Triggering test crash - this should only be used for testing!');
      crashlytics().crash();
    } else {
      console.warn('[CrashAnalytics] Test crash disabled in non-development environments');
    }
  }
}

// Mock implementation for development/testing
class MockCrashAnalytics implements CrashAnalyticsService {
  async initialize(): Promise<void> {
    console.log('[MockCrashAnalytics] Initialized (mock)');
  }

  recordError(error: Error, context?: Record<string, any>): void {
    console.log('[MockCrashAnalytics] Would record error:', error.message, context);
  }

  recordNonFatalError(error: Error, context?: Record<string, any>): void {
    console.log('[MockCrashAnalytics] Would record non-fatal error:', error.message, context);
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

// Export singleton instance
export const crashAnalytics: CrashAnalyticsService = new FirebaseCrashAnalytics();

// Export mock for testing
export const mockCrashAnalytics: CrashAnalyticsService = new MockCrashAnalytics();

// Convenience functions
export const initializeCrashAnalytics = () => crashAnalytics.initialize();
export const recordError = (error: Error, context?: Record<string, any>) => 
  crashAnalytics.recordError(error, context);
export const recordNonFatalError = (error: Error, context?: Record<string, any>) => 
  crashAnalytics.recordNonFatalError(error, context);
export const setUserId = (userId: string) => crashAnalytics.setUserId(userId);
export const setUserAttributes = (attributes: Record<string, string>) => 
  crashAnalytics.setUserAttributes(attributes);
export const logMessage = (message: string) => crashAnalytics.log(message);

// Development testing function
export const triggerTestCrash = () => {
  if (Environment.isDevelopment) {
    console.warn('⚠️ Triggering test crash in 3 seconds...');
    setTimeout(() => {
      crashAnalytics.crash();
    }, 3000);
  } else {
    console.warn('Test crash is only available in development environment');
  }
};