import React, { Component, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { useAppTheme } from '../providers/ThemeProvider';
import { Environment, Logger } from '../config/environment';

interface Props {
  children: ReactNode;
}

interface ErrorBoundaryInternalProps extends Props {
  theme: any;
  spacing: any;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryInternal extends Component<ErrorBoundaryInternalProps, State> {
  constructor(props: ErrorBoundaryInternalProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Only log errors in development - not visible to beta testers
    if (Environment.isDevelopment) {
      Logger.error('ErrorBoundary caught an error', { error, errorInfo });
    }
    
    // In staging/production, send to crash reporting service silently
    if (Environment.isStaging || Environment.isProduction) {
      // Silent error tracking - no console logs visible to users
      // TODO: Send to crash reporting service (Crashlytics, Sentry, Bugsnag)
      // Example: crashReporting.recordError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    const { theme, spacing } = this.props;
    const styles = createStyles(theme, spacing);

    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Card style={styles.errorCard}>
            <Card.Content style={styles.cardContent}>
              <Text variant="headlineSmall" style={styles.title}>
                Oops! Something went wrong
              </Text>
              
              <Text variant="bodyMedium" style={styles.message}>
                The app encountered an unexpected error. Don't worry - your data is safe.
              </Text>
              
              <Text variant="bodySmall" style={styles.suggestion}>
                Try refreshing the app or restart if the problem continues.
              </Text>
              
              <Button
                mode="contained"
                onPress={this.handleReset}
                style={styles.retryButton}
              >
                Try Again
              </Button>
              
              {Environment.isDevelopment && this.state.error && (
                <View style={styles.debugContainer}>
                  <Text variant="labelSmall" style={styles.debugTitle}>
                    Debug Info (Development Only):
                  </Text>
                  <Text variant="bodySmall" style={styles.debugText}>
                    {this.state.error.toString()}
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>
        </View>
      );
    }

    return this.props.children;
  }
}

const createStyles = (theme: any, spacing: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorCard: {
    width: '100%',
    maxWidth: 400,
  },
  cardContent: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  title: {
    color: theme.colors.error,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginBottom: spacing.sm,
    color: theme.colors.text,
  },
  suggestion: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    color: theme.colors.textSecondary,
  },
  retryButton: {
    marginTop: spacing.md,
    minWidth: 120,
  },
  debugContainer: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: theme.colors.border,
    borderRadius: 8,
    width: '100%',
  },
  debugTitle: {
    fontWeight: 'bold',
    marginBottom: spacing.xs,
    color: theme.colors.text,
  },
  debugText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
});

// Wrapper component to inject theme
const ErrorBoundary: React.FC<Props> = ({ children }) => {
  const { theme, spacing } = useAppTheme();
  
  return (
    <ErrorBoundaryInternal theme={theme} spacing={spacing}>
      {children}
    </ErrorBoundaryInternal>
  );
};

export default ErrorBoundary;