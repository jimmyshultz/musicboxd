// Supabase Edge Function: notify-report
// This function sends email notifications when new content reports are created
// It should be triggered by a database webhook on the content_reports table

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Configuration - Set these in Supabase Edge Function secrets
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || '';
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') || '';
const APP_NAME = 'Resonare';

interface ContentReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  content_type: string;
  content_id: string | null;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: ContentReport;
  schema: string;
  old_record: ContentReport | null;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendEmailViaSendGrid(
  to: string,
  subject: string,
  htmlContent: string
): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.log('SendGrid API key not configured, skipping email');
    return false;
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: 'noreply@resonareapp.com', name: APP_NAME },
        subject: subject,
        content: [{ type: 'text/html', value: htmlContent }],
      }),
    });

    if (response.ok) {
      console.log('Email sent successfully');
      return true;
    } else {
      const error = await response.text();
      console.error('SendGrid error:', error);
      return false;
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

function formatReportEmail(report: ContentReport): string {
  const contentTypeLabels: Record<string, string> = {
    profile: 'User Profile',
    rating: 'Album Rating/Review',
    diary_entry: 'Diary Entry',
  };

  const reasonLabels: Record<string, string> = {
    spam: 'Spam',
    harassment: 'Harassment',
    hate_speech: 'Hate Speech',
    inappropriate: 'Inappropriate Content',
    other: 'Other',
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #6200EE; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .field { margin-bottom: 15px; }
        .label { font-weight: bold; color: #666; }
        .value { margin-top: 5px; }
        .urgent { color: #d32f2f; font-weight: bold; }
        .action-link { display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #6200EE; color: white; text-decoration: none; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">New Content Report</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Action required within 24 hours</p>
        </div>
        <div class="content">
          <p class="urgent">A new content report requires your review.</p>
          
          <div class="field">
            <div class="label">Report ID</div>
            <div class="value">${report.id}</div>
          </div>
          
          <div class="field">
            <div class="label">Content Type</div>
            <div class="value">${contentTypeLabels[report.content_type] || report.content_type}</div>
          </div>
          
          <div class="field">
            <div class="label">Reason</div>
            <div class="value">${reasonLabels[report.reason] || report.reason}</div>
          </div>
          
          ${report.description ? `
          <div class="field">
            <div class="label">Additional Details</div>
            <div class="value">${report.description}</div>
          </div>
          ` : ''}
          
          <div class="field">
            <div class="label">Reporter ID</div>
            <div class="value">${report.reporter_id}</div>
          </div>
          
          <div class="field">
            <div class="label">Reported User ID</div>
            <div class="value">${report.reported_user_id}</div>
          </div>
          
          ${report.content_id ? `
          <div class="field">
            <div class="label">Content ID</div>
            <div class="value">${report.content_id}</div>
          </div>
          ` : ''}
          
          <div class="field">
            <div class="label">Submitted At</div>
            <div class="value">${new Date(report.created_at).toLocaleString()}</div>
          </div>
          
          <p style="margin-top: 20px; color: #666;">
            Please review this report in the Supabase dashboard and take appropriate action.
            Apple requires action on reports within 24 hours.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: WebhookPayload = await req.json();
    
    // Only process INSERT events (new reports)
    if (payload.type !== 'INSERT') {
      return new Response(
        JSON.stringify({ message: 'Ignored - not an INSERT event' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const report = payload.record;

    if (!ADMIN_EMAIL) {
      console.log('ADMIN_EMAIL not configured');
      return new Response(
        JSON.stringify({ message: 'Admin email not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send email notification
    const emailSent = await sendEmailViaSendGrid(
      ADMIN_EMAIL,
      `[${APP_NAME}] New Content Report - ${report.reason}`,
      formatReportEmail(report)
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailSent,
        reportId: report.id 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
