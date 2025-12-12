import { supabase } from './supabase';
import { 
  ContentReport, 
  ContentReportType, 
  ContentReportReason, 
  ContentReportStatus 
} from '../types/database';

/**
 * Report reasons with user-friendly labels
 */
export const REPORT_REASONS: { value: ContentReportReason; label: string; description: string }[] = [
  { 
    value: 'spam', 
    label: 'Spam', 
    description: 'Unwanted promotional content or repetitive messages' 
  },
  { 
    value: 'harassment', 
    label: 'Harassment', 
    description: 'Bullying, threats, or targeted abuse' 
  },
  { 
    value: 'hate_speech', 
    label: 'Hate Speech', 
    description: 'Content that promotes hatred against protected groups' 
  },
  { 
    value: 'inappropriate', 
    label: 'Inappropriate Content', 
    description: 'Sexual, violent, or otherwise objectionable content' 
  },
  { 
    value: 'other', 
    label: 'Other', 
    description: 'Other violation of community guidelines' 
  },
];

/**
 * Content types with user-friendly labels
 */
export const CONTENT_TYPES: { value: ContentReportType; label: string }[] = [
  { value: 'profile', label: 'User Profile' },
  { value: 'rating', label: 'Album Rating/Review' },
  { value: 'diary_entry', label: 'Diary Entry' },
];

/**
 * Service for managing content reports
 */
class ReportService {
  /**
   * Submit a content report
   */
  async submitReport(params: {
    reporterId: string;
    reportedUserId: string;
    contentType: ContentReportType;
    contentId?: string;
    reason: ContentReportReason;
    description?: string;
  }): Promise<{ success: boolean; error?: string; report?: ContentReport }> {
    try {
      // Validate that user is not reporting themselves
      if (params.reporterId === params.reportedUserId) {
        return { success: false, error: 'You cannot report yourself' };
      }

      // Check if user has already reported this content
      const existingReport = await this.hasExistingReport(
        params.reporterId,
        params.reportedUserId,
        params.contentType,
        params.contentId
      );

      if (existingReport) {
        return { success: false, error: 'You have already reported this content' };
      }

      const { data, error } = await supabase
        .from('content_reports')
        .insert({
          reporter_id: params.reporterId,
          reported_user_id: params.reportedUserId,
          content_type: params.contentType,
          content_id: params.contentId || null,
          reason: params.reason,
          description: params.description || null,
          status: 'pending' as ContentReportStatus,
        })
        .select()
        .single();

      if (error) {
        console.error('Error submitting report:', error);
        throw error;
      }

      return { success: true, report: data };
    } catch (error) {
      console.error('Error submitting report:', error);
      return { success: false, error: 'Failed to submit report. Please try again.' };
    }
  }

  /**
   * Check if user has already reported this specific content
   */
  async hasExistingReport(
    reporterId: string,
    reportedUserId: string,
    contentType: ContentReportType,
    contentId?: string
  ): Promise<boolean> {
    try {
      let query = supabase
        .from('content_reports')
        .select('id')
        .eq('reporter_id', reporterId)
        .eq('reported_user_id', reportedUserId)
        .eq('content_type', contentType);

      if (contentId) {
        query = query.eq('content_id', contentId);
      } else {
        query = query.is('content_id', null);
      }

      const { data, error } = await query.limit(1);

      if (error) {
        console.error('Error checking existing report:', error);
        return false;
      }

      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Error checking existing report:', error);
      return false;
    }
  }

  /**
   * Get reports submitted by a user
   */
  async getMyReports(userId: string): Promise<ContentReport[]> {
    try {
      const { data, error } = await supabase
        .from('content_reports')
        .select('*')
        .eq('reporter_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting reports:', error);
      return [];
    }
  }

  /**
   * Report a user profile
   */
  async reportUserProfile(
    reporterId: string,
    reportedUserId: string,
    reason: ContentReportReason,
    description?: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.submitReport({
      reporterId,
      reportedUserId,
      contentType: 'profile',
      reason,
      description,
    });
  }

  /**
   * Report an album rating/review
   */
  async reportRating(
    reporterId: string,
    reportedUserId: string,
    ratingId: string,
    reason: ContentReportReason,
    description?: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.submitReport({
      reporterId,
      reportedUserId,
      contentType: 'rating',
      contentId: ratingId,
      reason,
      description,
    });
  }

  /**
   * Report a diary entry
   */
  async reportDiaryEntry(
    reporterId: string,
    reportedUserId: string,
    entryId: string,
    reason: ContentReportReason,
    description?: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.submitReport({
      reporterId,
      reportedUserId,
      contentType: 'diary_entry',
      contentId: entryId,
      reason,
      description,
    });
  }
}

// Export singleton instance
export const reportService = new ReportService();
