import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import {
  Text,
  Card,
  Button,
} from 'react-native-paper';

import { theme, spacing } from '../../utils/theme';

export default function AuthScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineLarge" style={styles.title}>
          Musicboxd
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Track, Rate, Discover
        </Text>
        
        <Card style={styles.authCard} elevation={2}>
          <Card.Content>
            <Text variant="bodyMedium" style={styles.comingSoonText}>
              Authentication coming soon!
            </Text>
            <Text variant="bodySmall" style={styles.description}>
              Sign up to track your listening history, rate albums, and connect with fellow music lovers.
            </Text>
          </Card.Content>
        </Card>
        
        <Button
          mode="contained"
          style={styles.button}
          onPress={() => {}}
        >
          Continue as Guest
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  title: {
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    color: theme.colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  authCard: {
    width: '100%',
    marginBottom: spacing.xl,
    backgroundColor: theme.colors.surface,
  },
  comingSoonText: {
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  description: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  button: {
    width: '100%',
  },
});