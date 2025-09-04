/**
 * Console Suppression for Beta Testing
 * Completely disables all console output for beta testers
 */
import { Environment } from '../config/environment';

export const suppressConsoleForBetaUsers = () => {
  if (Environment.isStaging || Environment.isProduction) {
    // Store original console methods for crash reporting
    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
      trace: console.trace,
      table: console.table,
      group: console.group,
      groupEnd: console.groupEnd,
      time: console.time,
      timeEnd: console.timeEnd,
    };

    // Make original console available for crash reporting services
    (global as any).__DEV_CONSOLE__ = originalConsole;

    // Suppress all console output
    console.log = () => {};
    console.info = () => {};
    console.warn = () => {};
    console.error = () => {};
    console.debug = () => {};
    console.trace = () => {};
    console.table = () => {};
    console.group = () => {};
    console.groupEnd = () => {};
    console.time = () => {};
    console.timeEnd = () => {};

    // Also suppress React Native specific logging
    if (global.nativeLoggingHook) {
      global.nativeLoggingHook = () => {};
    }
  }
};

export const enableConsoleForDevelopment = () => {
  // Console is enabled by default in development
  // This function exists for completeness but doesn't need to do anything
};