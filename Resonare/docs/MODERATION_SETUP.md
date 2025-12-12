# Content Moderation Setup Guide

This guide explains how to set up the content moderation infrastructure required for App Store Guideline 1.2 compliance.

## Overview

The moderation system consists of:
1. **Database tables** for reports and blocked users
2. **Report notifications** via email when new reports are submitted
3. **Admin tools** for reviewing and acting on reports

## Prerequisites

- Supabase project with access to the dashboard
- SendGrid account for email notifications (or alternative email service)

## Step 1: Apply Database Migration

Run the migration to create the required tables:

```sql
-- Execute the contents of:
-- database/migrations/add_ugc_safety_tables.sql
```

This creates:
- `blocked_users` table
- `content_reports` table
- `terms_accepted_at`, `is_banned`, `banned_at`, `ban_reason` columns on `user_profiles`
- RLS policies for security
- Helper functions for moderation

## Step 2: Set Up Email Notifications

### Option A: Supabase Edge Function with SendGrid

1. **Create a SendGrid Account**
   - Sign up at https://sendgrid.com
   - Create an API key with email sending permissions

2. **Deploy the Edge Function**
   ```bash
   cd Resonare
   supabase functions deploy notify-report
   ```

3. **Set Environment Secrets**
   ```bash
   supabase secrets set ADMIN_EMAIL=your-admin-email@example.com
   supabase secrets set SENDGRID_API_KEY=your-sendgrid-api-key
   ```

4. **Create Database Webhook**
   In Supabase Dashboard:
   - Go to Database > Webhooks
   - Create a new webhook:
     - Name: `notify-new-reports`
     - Table: `content_reports`
     - Events: `INSERT`
     - Webhook URL: Your Edge Function URL
     - HTTP Headers: Add `Authorization: Bearer <your-service-role-key>`

### Option B: Supabase Database Trigger + pg_net

Alternatively, use PostgreSQL's `pg_net` extension to send HTTP requests directly from a database trigger.

```sql
-- Enable pg_net extension (if available in your Supabase plan)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a trigger function
CREATE OR REPLACE FUNCTION notify_new_report()
RETURNS TRIGGER AS $$
BEGIN
  -- Send HTTP request to your notification endpoint
  PERFORM net.http_post(
    url := 'https://your-notification-endpoint.com/webhook',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := json_build_object(
      'report_id', NEW.id,
      'content_type', NEW.content_type,
      'reason', NEW.reason,
      'created_at', NEW.created_at
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER on_new_report
  AFTER INSERT ON content_reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_report();
```

## Step 3: Review Reports

### Using Supabase Dashboard

1. Go to **Table Editor** > `content_reports`
2. Filter by `status = 'pending'` to see reports needing review
3. Review each report and take action

### Taking Action on Reports

Use the `moderate_content` function to process reports:

```sql
-- Dismiss a report (no action needed)
SELECT moderate_content(
  'report-uuid-here',
  'dismiss',
  'admin@example.com',
  'No violation found'
);

-- Remove the reported content
SELECT moderate_content(
  'report-uuid-here',
  'remove_content',
  'admin@example.com',
  'Content removed - violated community guidelines'
);

-- Ban the user
SELECT moderate_content(
  'report-uuid-here',
  'ban_user',
  'admin@example.com',
  'User banned for repeated violations'
);
```

## Step 4: Monitor Ban Status

Banned users have `is_banned = true` in `user_profiles`. The app should:
1. Check ban status on app launch
2. Prevent banned users from accessing the app
3. Display an appropriate message

Add this check to your app's auth flow:

```typescript
// In AuthProvider or when initializing auth
const checkBanStatus = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('is_banned, ban_reason')
    .eq('id', userId)
    .single();
    
  if (data?.is_banned) {
    // Sign out and show ban message
    await supabase.auth.signOut();
    Alert.alert(
      'Account Suspended',
      'Your account has been suspended for violating our community guidelines.',
      [{ text: 'OK' }]
    );
    return false;
  }
  return true;
};
```

## Response Time Requirements

**Apple requires action on reports within 24 hours.**

Recommended workflow:
1. Set up email notifications to alert you immediately
2. Check the `content_reports` table daily
3. Document your moderation decisions
4. Keep records of actions taken for compliance

## Testing the System

1. Create a test report in the app
2. Verify you receive an email notification
3. Test the moderation functions in Supabase
4. Verify blocked users are filtered from feeds

## Community Guidelines Template

Your Terms of Service and Community Guidelines should include:

1. **Prohibited Content**
   - Hate speech
   - Harassment and bullying
   - Spam and commercial promotion
   - Sexual or violent content
   - Personal information sharing

2. **Consequences**
   - First offense: Content removal + warning
   - Second offense: Temporary suspension
   - Third offense: Permanent ban

3. **Reporting Process**
   - How to report content
   - What happens after a report
   - Expected response time

4. **Appeals Process** (optional but recommended)
   - How to appeal a decision
   - Timeline for appeals
