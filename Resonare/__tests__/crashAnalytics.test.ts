/**
 * Crash Analytics Service Tests
 */

// Mock the Firebase module
jest.mock('@react-native-firebase/crashlytics', () => ({
  __esModule: true,
  default: () => ({
    setCrashlyticsCollectionEnabled: jest.fn(),
    setAttributes: jest.fn(),
    log: jest.fn(),
    recordError: jest.fn(),
    setUserId: jest.fn(),
    crash: jest.fn(),
  }),
}));

// Mock the environment
jest.mock('../src/config/environment', () => ({
  Environment: {
    current: 'test',
    isDevelopment: true,
    isStaging: false,
    isProduction: false,
  },
}));

import { mockCrashAnalytics } from '../src/services/crashAnalytics';

describe('CrashAnalytics Service', () => {
  beforeEach(() => {
    // Clear any previous console logs
    jest.clearAllMocks();
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  it('should initialize without errors', async () => {
    await expect(mockCrashAnalytics.initialize()).resolves.not.toThrow();
  });

  it('should record errors', () => {
    const testError = new Error('Test error');
    const context = { test: 'context' };
    
    expect(() => {
      mockCrashAnalytics.recordError(testError, context);
    }).not.toThrow();
  });

  it('should record non-fatal errors', () => {
    const testError = new Error('Test non-fatal error');
    const context = { test: 'non-fatal' };
    
    expect(() => {
      mockCrashAnalytics.recordNonFatalError(testError, context);
    }).not.toThrow();
  });

  it('should set user ID', () => {
    const userId = 'test-user-123';
    
    expect(() => {
      mockCrashAnalytics.setUserId(userId);
    }).not.toThrow();
  });

  it('should set user attributes', () => {
    const attributes = {
      userType: 'beta',
      environment: 'test'
    };
    
    expect(() => {
      mockCrashAnalytics.setUserAttributes(attributes);
    }).not.toThrow();
  });

  it('should log messages', () => {
    const message = 'Test log message';
    
    expect(() => {
      mockCrashAnalytics.log(message);
    }).not.toThrow();
  });

  it('should handle test crashes safely', () => {
    expect(() => {
      mockCrashAnalytics.crash();
    }).not.toThrow();
  });
});