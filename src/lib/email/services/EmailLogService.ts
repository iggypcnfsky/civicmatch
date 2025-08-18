import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export type EmailType = 'welcome' | 'password_reset' | 'profile_reminder' | 'weekly_match';
export type EmailStatus = 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed' | 'delayed' | 'complained';

interface EmailLogData {
  template_version?: string;
  recipient_email?: string;
  subject?: string;
  webhook_event?: {
    type: string;
    timestamp: string;
    bounce_type?: string;
    complaint_type?: string;
    clicked_url?: string;
  };
  [key: string]: unknown;
}

export class EmailLogService {
  private supabase: ReturnType<typeof createClient<Database>>;

  constructor() {
    // Use anon key - safer than service role, works with RLS policies
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      throw new Error('Missing Supabase configuration for EmailLogService');
    }

    this.supabase = createClient<Database>(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  /**
   * Log when an email is sent
   * Only call this from server-side code (API routes, server actions)
   */
  async logEmailSent({
    userId,
    emailType,
    resendId,
    recipientEmail,
    subject,
    templateVersion = '1.0'
  }: {
    userId: string;
    emailType: EmailType;
    resendId?: string;
    recipientEmail: string;
    subject: string;
    templateVersion?: string;
  }) {
    try {
      // Basic validation to prevent obviously invalid data
      if (!userId || !emailType || !recipientEmail) {
        console.error('Invalid email log data - missing required fields');
        return null;
      }

      // Validate UUID format for userId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        console.error('Invalid userId format');
        return null;
      }

      const { data, error } = await this.supabase
        .from('email_logs')
        .insert({
          user_id: userId,
          email_type: emailType,
          resend_id: resendId,
          status: 'sent',
          data: {
            template_version: templateVersion,
            recipient_email: recipientEmail,
            subject
          }
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to log email send:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('EmailLogService.logEmailSent error:', error);
      return null;
    }
  }

  /**
   * Update email status (called by webhook)
   * Only call this from verified webhook endpoints
   */
  async updateEmailStatus({
    resendId,
    status,
    webhookData
  }: {
    resendId: string;
    status: EmailStatus;
    webhookData?: EmailLogData['webhook_event'];
  }) {
    try {
      // Validate required fields
      if (!resendId || !status) {
        console.error('Invalid webhook data - missing required fields');
        return null;
      }

      // Only update if resend_id exists (prevents creating fake records)
      const { data, error } = await this.supabase
        .from('email_logs')
        .update({
          status,
          updated_at: new Date().toISOString(),
          data: {
            webhook_event: webhookData
          }
        })
        .eq('resend_id', resendId)
        .select();

      if (error) {
        console.error('Failed to update email status:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('EmailLogService.updateEmailStatus error:', error);
      return null;
    }
  }

  /**
   * Get email logs for a user (for debugging/analytics)
   */
  async getUserEmailLogs(userId: string, limit = 50) {
    try {
      const { data, error } = await this.supabase
        .from('email_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to get user email logs:', error);
        return [];
      }

      return data;
    } catch (error) {
      console.error('EmailLogService.getUserEmailLogs error:', error);
      return [];
    }
  }

  /**
   * Get email delivery statistics
   */
  async getEmailStats(emailType?: EmailType, days = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      let query = this.supabase
        .from('email_logs')
        .select('status, email_type, created_at')
        .gte('created_at', cutoffDate.toISOString());

      if (emailType) {
        query = query.eq('email_type', emailType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to get email stats:', error);
        return null;
      }

      // Calculate statistics
      const stats = data.reduce((acc, log) => {
        acc.total++;
        acc.byStatus[log.status] = (acc.byStatus[log.status] || 0) + 1;
        acc.byType[log.email_type] = (acc.byType[log.email_type] || 0) + 1;
        return acc;
      }, {
        total: 0,
        byStatus: {} as Record<string, number>,
        byType: {} as Record<string, number>
      });

      return {
        ...stats,
        deliveryRate: stats.total > 0 ? (stats.byStatus.delivered || 0) / stats.total : 0,
        bounceRate: stats.total > 0 ? (stats.byStatus.bounced || 0) / stats.total : 0,
        openRate: stats.total > 0 ? (stats.byStatus.opened || 0) / stats.total : 0
      };
    } catch (error) {
      console.error('EmailLogService.getEmailStats error:', error);
      return null;
    }
  }

  /**
   * Check if user has bounced emails (for suppression)
   */
  async hasRecentBounces(userId: string, days = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { data, error } = await this.supabase
        .from('email_logs')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'bounced')
        .gte('created_at', cutoffDate.toISOString())
        .limit(1);

      if (error) {
        console.error('Failed to check bounce status:', error);
        return false;
      }

      return data.length > 0;
    } catch (error) {
      console.error('EmailLogService.hasRecentBounces error:', error);
      return false;
    }
  }
}
