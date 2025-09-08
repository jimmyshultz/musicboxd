// Error handling utilities for API calls and user experience

export enum ErrorType {
  NETWORK = 'NETWORK',
  API_ERROR = 'API_ERROR',
  AUTHENTICATION = 'AUTHENTICATION',
  RATE_LIMIT = 'RATE_LIMIT',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN',
}

export interface AppError {
  type: ErrorType;
  message: string;
  userMessage: string;
  details?: any;
  retryable: boolean;
}

/**
 * Create a user-friendly error from various error types
 */
export function createAppError(error: any): AppError {
  // Network errors
  if (!navigator.onLine) {
    return {
      type: ErrorType.NETWORK,
      message: 'No internet connection',
      userMessage: 'Please check your internet connection and try again.',
      retryable: true,
    };
  }

  // Fetch errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: ErrorType.NETWORK,
      message: 'Network request failed',
      userMessage: 'Unable to connect to the server. Please try again.',
      retryable: true,
    };
  }

  // Spotify API specific errors
  if (error.message?.includes('Spotify API error')) {
    const statusMatch = error.message.match(/(\d{3})/);
    const status = statusMatch ? parseInt(statusMatch[1], 10) : 0;

    if (status === 401) {
      return {
        type: ErrorType.AUTHENTICATION,
        message: 'Spotify authentication failed',
        userMessage: 'There was an authentication issue. The app will use cached data.',
        retryable: false,
      };
    }

    if (status === 429) {
      return {
        type: ErrorType.RATE_LIMIT,
        message: 'Spotify rate limit exceeded',
        userMessage: 'Too many requests. Please wait a moment and try again.',
        retryable: true,
      };
    }

    if (status === 404) {
      return {
        type: ErrorType.NOT_FOUND,
        message: 'Resource not found on Spotify',
        userMessage: 'The requested content was not found.',
        retryable: false,
      };
    }

    if (status >= 500) {
      return {
        type: ErrorType.API_ERROR,
        message: 'Spotify server error',
        userMessage: 'Spotify is experiencing issues. Using cached data instead.',
        retryable: true,
      };
    }
  }

  // Authentication errors
  if (error.message?.includes('Authentication failed')) {
    return {
      type: ErrorType.AUTHENTICATION,
      message: 'Authentication failed',
      userMessage: 'Unable to authenticate with music service. Using offline data.',
      retryable: false,
    };
  }

  // Configuration errors
  if (error.message?.includes('not configured')) {
    return {
      type: ErrorType.VALIDATION,
      message: 'Service not configured',
      userMessage: 'Music service is not set up. Using sample data for now.',
      retryable: false,
    };
  }

  // Generic API errors
  if (error.message?.includes('API') || error.status) {
    return {
      type: ErrorType.API_ERROR,
      message: error.message || 'API request failed',
      userMessage: 'Unable to fetch the latest data. Using cached content.',
      details: error,
      retryable: true,
    };
  }

  // Default unknown error
  return {
    type: ErrorType.UNKNOWN,
    message: error.message || 'Unknown error occurred',
    userMessage: 'Something went wrong. Please try again.',
    details: error,
    retryable: true,
  };
}

/**
 * Log errors with appropriate level based on type
 */
export function logError(error: AppError, context: string = '') {
  const logMessage = `[${error.type}] ${context}: ${error.message}`;
  
  switch (error.type) {
    case ErrorType.NETWORK:
    case ErrorType.RATE_LIMIT:
      console.warn(logMessage, error.details);
      break;
    
    case ErrorType.AUTHENTICATION:
    case ErrorType.API_ERROR:
      console.error(logMessage, error.details);
      break;
    
    case ErrorType.NOT_FOUND:
    case ErrorType.VALIDATION:
      console.info(logMessage);
      break;
    
    default:
      console.error(logMessage, error.details);
  }
}

/**
 * Determine if an error should trigger a retry
 */
export function shouldRetry(error: AppError, attemptCount: number = 1): boolean {
  if (!error.retryable || attemptCount >= 3) {
    return false;
  }

  // Don't retry authentication or validation errors
  if (error.type === ErrorType.AUTHENTICATION || error.type === ErrorType.VALIDATION) {
    return false;
  }

  // Don't retry not found errors
  if (error.type === ErrorType.NOT_FOUND) {
    return false;
  }

  return true;
}

/**
 * Get retry delay based on attempt count and error type
 */
export function getRetryDelay(error: AppError, attemptCount: number): number {
  const baseDelay = 1000; // 1 second
  
  switch (error.type) {
    case ErrorType.RATE_LIMIT:
      return baseDelay * Math.pow(2, attemptCount); // Exponential backoff
    
    case ErrorType.NETWORK:
      return baseDelay * attemptCount; // Linear backoff
    
    default:
      return baseDelay;
  }
}

/**
 * Create a user notification message for errors
 */
export function getErrorNotification(error: AppError): {
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info';
} {
  switch (error.type) {
    case ErrorType.NETWORK:
      return {
        title: 'Connection Issue',
        message: error.userMessage,
        type: 'warning',
      };
    
    case ErrorType.RATE_LIMIT:
      return {
        title: 'Please Wait',
        message: error.userMessage,
        type: 'info',
      };
    
    case ErrorType.AUTHENTICATION:
      return {
        title: 'Service Unavailable',
        message: error.userMessage,
        type: 'info',
      };
    
    case ErrorType.NOT_FOUND:
      return {
        title: 'Not Found',
        message: error.userMessage,
        type: 'info',
      };
    
    case ErrorType.VALIDATION:
      return {
        title: 'Setup Required',
        message: error.userMessage,
        type: 'info',
      };
    
    default:
      return {
        title: 'Something Went Wrong',
        message: error.userMessage,
        type: 'error',
      };
  }
}

/**
 * Wrapper for async operations with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string,
  fallback?: T
): Promise<{ data: T | null; error: AppError | null }> {
  try {
    const data = await operation();
    return { data, error: null };
  } catch (rawError) {
    const error = createAppError(rawError);
    logError(error, context);
    
    return { 
      data: fallback || null, 
      error 
    };
  }
}

/**
 * Retry wrapper for operations
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  context: string,
  maxAttempts: number = 3
): Promise<T> {
  let lastError: AppError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (rawError) {
      lastError = createAppError(rawError);
      logError(lastError, `${context} (attempt ${attempt}/${maxAttempts})`);
      
      if (!shouldRetry(lastError, attempt) || attempt === maxAttempts) {
        throw lastError;
      }
      
      const delay = getRetryDelay(lastError, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}