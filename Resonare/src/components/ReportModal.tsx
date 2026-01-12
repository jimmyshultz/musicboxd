import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Text,
  Button,
  TextInput,
  RadioButton,
  useTheme,
  IconButton,
} from 'react-native-paper';

import { ContentReportType, ContentReportReason } from '../types/database';
import { reportService, REPORT_REASONS } from '../services/reportService';
import { spacing } from '../utils/theme';

interface ReportModalProps {
  visible: boolean;
  onDismiss: () => void;
  reporterId: string;
  reportedUserId: string;
  reportedUsername: string;
  contentType: ContentReportType;
  contentId?: string;
  onReportSubmitted?: () => void;
}

export default function ReportModal({
  visible,
  onDismiss,
  reporterId,
  reportedUserId,
  reportedUsername,
  contentType,
  contentId,
  onReportSubmitted,
}: ReportModalProps) {
  const theme = useTheme();
  const styles = createStyles(theme);

  const [selectedReason, setSelectedReason] =
    useState<ContentReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Error', 'Please select a reason for your report');
      return;
    }

    setSubmitting(true);
    try {
      const result = await reportService.submitReport({
        reporterId,
        reportedUserId,
        contentType,
        contentId,
        reason: selectedReason,
        description: description.trim() || undefined,
      });

      if (result.success) {
        Alert.alert(
          'Report Submitted',
          'Thank you for your report. Our team will review it within 24 hours.',
          [{ text: 'OK', onPress: handleClose }],
        );
        onReportSubmitted?.();
      } else {
        Alert.alert('Error', result.error || 'Failed to submit report');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason(null);
    setDescription('');
    onDismiss();
  };

  const getContentTypeLabel = (): string => {
    switch (contentType) {
      case 'profile':
        return 'user profile';
      case 'rating':
        return 'review';
      case 'diary_entry':
        return 'diary entry';
      default:
        return 'content';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>
            Report {getContentTypeLabel()}
          </Text>
          <IconButton icon="close" size={24} onPress={handleClose} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text variant="bodyMedium" style={styles.subtitle}>
            You are reporting @{reportedUsername}'s {getContentTypeLabel()}.
          </Text>

          <Text variant="titleMedium" style={styles.sectionTitle}>
            Why are you reporting this?
          </Text>

          <RadioButton.Group
            value={selectedReason || ''}
            onValueChange={value =>
              setSelectedReason(value as ContentReportReason)
            }
          >
            {REPORT_REASONS.map(reason => (
              <TouchableOpacity
                key={reason.value}
                style={[
                  styles.reasonItem,
                  selectedReason === reason.value && styles.reasonItemSelected,
                ]}
                onPress={() => setSelectedReason(reason.value)}
              >
                <View style={styles.reasonContent}>
                  <View style={styles.reasonHeader}>
                    <RadioButton value={reason.value} />
                    <Text variant="titleSmall" style={styles.reasonLabel}>
                      {reason.label}
                    </Text>
                  </View>
                  <Text variant="bodySmall" style={styles.reasonDescription}>
                    {reason.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </RadioButton.Group>

          <Text variant="titleMedium" style={styles.sectionTitle}>
            Additional details (optional)
          </Text>

          <TextInput
            mode="outlined"
            placeholder="Provide any additional context that might help us review this report..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            style={styles.textInput}
            maxLength={500}
          />
          <Text variant="bodySmall" style={styles.charCount}>
            {description.length}/500
          </Text>

          <Text variant="bodySmall" style={styles.disclaimer}>
            Reports are reviewed by our team within 24 hours. False reports may
            result in action against your account.
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            mode="outlined"
            onPress={handleClose}
            style={styles.cancelButton}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleSubmit}
            style={styles.submitButton}
            loading={submitting}
            disabled={!selectedReason || submitting}
          >
            Submit Report
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline,
    },
    title: {
      fontWeight: 'bold',
    },
    content: {
      flex: 1,
      padding: spacing.lg,
    },
    subtitle: {
      color: theme.colors.onSurfaceVariant,
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      fontWeight: '600',
      marginBottom: spacing.md,
      marginTop: spacing.md,
    },
    reasonItem: {
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: 12,
      marginBottom: spacing.sm,
      backgroundColor: theme.colors.surface,
    },
    reasonItemSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primaryContainer,
    },
    reasonContent: {
      padding: spacing.sm,
    },
    reasonHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    reasonLabel: {
      fontWeight: '600',
      flex: 1,
    },
    reasonDescription: {
      color: theme.colors.onSurfaceVariant,
      marginLeft: 40,
      marginTop: -4,
    },
    textInput: {
      backgroundColor: theme.colors.surface,
    },
    charCount: {
      textAlign: 'right',
      color: theme.colors.onSurfaceVariant,
      marginTop: spacing.xs,
    },
    disclaimer: {
      color: theme.colors.onSurfaceVariant,
      marginTop: spacing.lg,
      fontStyle: 'italic',
      lineHeight: 18,
    },
    footer: {
      flexDirection: 'row',
      padding: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outline,
      gap: spacing.md,
    },
    cancelButton: {
      flex: 1,
    },
    submitButton: {
      flex: 1,
    },
  });
