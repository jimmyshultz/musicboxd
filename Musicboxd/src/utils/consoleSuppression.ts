/**
 * Console Suppression for Beta Testing
 * Completely disables all console output for beta testers
 */
import { Environment } from '../config/environment';

export const suppressConsoleForBetaUsers = () => {
  if (Environment.isStaging || Environment.isProduction) {
    // Store original console methods for crash reporting
    const originalConsole = { ...console };
    
    // Make original console available for crash reporting services
    (global as any).__DEV_CONSOLE__ = originalConsole;

    // Create a completely silent console object
    const silentConsole = {
      assert: () => {},
      clear: () => {},
      count: () => {},
      countReset: () => {},
      debug: () => {},
      dir: () => {},
      dirxml: () => {},
      error: () => {},
      group: () => {},
      groupCollapsed: () => {},
      groupEnd: () => {},
      info: () => {},
      log: () => {},
      profile: () => {},
      profileEnd: () => {},
      table: () => {},
      time: () => {},
      timeEnd: () => {},
      timeLog: () => {},
      timeStamp: () => {},
      trace: () => {},
      warn: () => {},
    };

    // Replace console completely
    Object.assign(console, silentConsole);

    // Suppress React Native specific logging
    if (global.nativeLoggingHook) {
      global.nativeLoggingHook = () => {};
    }

    // Override React's error logging completely
    if (typeof ErrorUtils !== 'undefined') {
      const originalSetGlobalHandler = ErrorUtils.setGlobalHandler;
      ErrorUtils.setGlobalHandler = () => {};
      ErrorUtils.getGlobalHandler = () => () => {};
      
      // Override the error reporter
      if (ErrorUtils.reportError) {
        ErrorUtils.reportError = () => {};
      }
      if (ErrorUtils.reportFatalError) {
        ErrorUtils.reportFatalError = () => {};
      }
    }

    // Suppress React DevTools and other development warnings
    (global as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      isDisabled: true,
      supportsFiber: true,
      inject: () => {},
      onCommitFiberRoot: () => {},
      onCommitFiberUnmount: () => {},
    };

    // Suppress any remaining console-related properties
    (console as any).reportErrorsAsExceptions = false;
    if ((console as any).disableYellowBox !== undefined) {
      (console as any).disableYellowBox = true;
    }
  }
};

export const enableConsoleForDevelopment = () => {
  // Console is enabled by default in development
  // This function exists for completeness but doesn't need to do anything
};