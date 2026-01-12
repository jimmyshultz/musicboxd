/**
 * Crash Test Screen - Development Only
 * Allows testing crash analytics functionality
 */
import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { colors, spacing } from '../utils/theme';
import { Environment } from '../config/environment';
import {
  triggerTestCrash,
  recordError,
  recordNonFatalError,
  setUserId,
  setUserAttributes,
  logMessage,
} from '../services/crashAnalytics';

const CrashTestScreen = () => {
  const [testCount, setTestCount] = useState(0);

  if (!Environment.isDevelopment) {
    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.title}>
              Crash Test Unavailable
            </Text>
            <Text variant="bodyMedium">
              This screen is only available in development environment.
            </Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  const handleTestCrash = () => {
    Alert.alert(
      'Test Crash',
      'This will crash the app to test crash reporting. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Crash App',
          style: 'destructive',
          onPress: triggerTestCrash,
        },
      ],
    );
  };

  const handleTestError = () => {
    const error = new Error(`Test error #${testCount + 1}`);
    recordError(error, {
      test_type: 'manual_error_test',
      test_count: String(testCount + 1),
      screen: 'CrashTestScreen',
    });
    setTestCount(testCount + 1);
    Alert.alert(
      'Error Recorded',
      'Test error has been sent to crash analytics.',
    );
  };

  const handleTestNonFatalError = () => {
    const error = new Error(`Test non-fatal error #${testCount + 1}`);
    recordNonFatalError(error, {
      test_type: 'manual_non_fatal_test',
      test_count: String(testCount + 1),
      screen: 'CrashTestScreen',
    });
    setTestCount(testCount + 1);
    Alert.alert(
      'Non-Fatal Error Recorded',
      'Test non-fatal error has been sent to crash analytics.',
    );
  };

  const handleSetTestUser = () => {
    const testUserId = `test_user_${Date.now()}`;
    setUserId(testUserId);
    setUserAttributes({
      user_type: 'test_user',
      test_session: 'crash_test_screen',
      environment: Environment.current,
    });
    Alert.alert('User Set', `Test user ID set: ${testUserId}`);
  };

  const handleLogMessage = () => {
    const message = `Test log message at ${new Date().toISOString()}`;
    logMessage(message);
    Alert.alert(
      'Message Logged',
      'Test message has been logged to crash analytics.',
    );
  };

  const handleJavaScriptError = () => {
    // This will trigger an unhandled JavaScript error
    setTimeout(() => {
      throw new Error('Test JavaScript error for crash analytics');
    }, 1000);
    Alert.alert(
      'JavaScript Error Triggered',
      'An unhandled JavaScript error will occur in 1 second.',
    );
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>
            🧪 Crash Analytics Testing
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Development environment only
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Crash Testing
          </Text>

          <Button
            mode="contained"
            onPress={handleTestCrash}
            style={[styles.button, styles.dangerButton]}
            buttonColor={colors.error}
          >
            Trigger Test Crash
          </Button>

          <Button
            mode="contained"
            onPress={handleJavaScriptError}
            style={[styles.button, styles.dangerButton]}
            buttonColor={colors.error}
          >
            Trigger JS Error
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Error Reporting
          </Text>

          <Button
            mode="contained"
            onPress={handleTestError}
            style={styles.button}
          >
            Record Test Error
          </Button>

          <Button
            mode="contained"
            onPress={handleTestNonFatalError}
            style={styles.button}
          >
            Record Non-Fatal Error
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            User & Logging
          </Text>

          <Button
            mode="contained"
            onPress={handleSetTestUser}
            style={styles.button}
          >
            Set Test User
          </Button>

          <Button
            mode="contained"
            onPress={handleLogMessage}
            style={styles.button}
          >
            Log Test Message
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="bodySmall" style={styles.info}>
            Tests performed: {testCount}
          </Text>
          <Text variant="bodySmall" style={styles.info}>
            Environment: {Environment.getDisplayName()}
          </Text>
          <Text variant="bodySmall" style={styles.info}>
            Check Firebase Console for crash reports after testing.
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.xs,
    color: colors.primary,
  },
  subtitle: {
    textAlign: 'center',
    color: colors.textSecondary,
  },
  sectionTitle: {
    marginBottom: spacing.md,
    color: colors.text,
  },
  button: {
    marginBottom: spacing.sm,
  },
  dangerButton: {
    marginBottom: spacing.sm,
  },
  info: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
});

export default CrashTestScreen;
