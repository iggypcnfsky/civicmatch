import { render } from '@react-email/render';
import { resend, emailConfig } from '../resend';
import { EmailLogService, type EmailType } from './EmailLogService';
import { WelcomeEmail, PasswordResetEmail, ProfileReminderEmail, WeeklyMatchEmail } from '../templates';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  userId?: string; // For logging purposes
  emailType?: EmailType;
  templateVersion?: string;
}

export interface WelcomeEmailData {
  displayName: string;
  username: string;
  profileCompletionUrl?: string;
  exploreUrl?: string;
  unsubscribeUrl?: string;
  preferencesUrl?: string;
}

export interface PasswordResetEmailData {
  displayName: string;
  resetUrl: string;
  expiresAt: string;
  unsubscribeUrl?: string;
  preferencesUrl?: string;
}

export interface MissingField {
  field: string;
  description: string;
  importance: string;
}

export interface ProfileReminderEmailData {
  displayName: string;
  completionPercentage: number;
  missingFields: MissingField[];
  profileUrl?: string;
  unsubscribeUrl?: string;
  preferencesUrl?: string;
}

export interface WeeklyMatchEmailData {
  currentUser: {
    displayName: string;
    username: string;
    avatarUrl?: string;
    bio?: string;
    skills?: string[];
    causes?: string[];
    values?: string[];
  };
  matchedUser: {
    displayName: string;
    username: string;
    avatarUrl?: string;
    bio?: string;
    skills?: string[];
    causes?: string[];
    values?: string[];
    fame?: string;
    aim?: Array<{ title: string; summary: string }>;
    game?: string;
    workStyle?: string;
    helpNeeded?: string;
  };
  matchReason: {
    sharedValues: string[];
    sharedSkills: string[];
    sharedCauses: string[];
    explanation: string;
  };
  profileUrl: string;
  messageUrl: string;
  unsubscribeUrl?: string;
  preferencesUrl?: string;
}

export class EmailService {
  private emailLogService: EmailLogService;

  constructor() {
    this.emailLogService = new EmailLogService();
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(
    to: string,
    data: WelcomeEmailData,
    options: Omit<SendEmailOptions, 'to' | 'subject'> = {}
  ) {
    return this.sendTemplatedEmail({
      ...options,
      to,
      subject: `Welcome to CivicMatch, ${data.displayName}! 🎉`,
      emailType: 'welcome',
      templateData: data,
      renderTemplate: async () => render(WelcomeEmail(data)),
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    to: string,
    data: PasswordResetEmailData,
    options: Omit<SendEmailOptions, 'to' | 'subject'> = {}
  ) {
    return this.sendTemplatedEmail({
      ...options,
      to,
      subject: 'Reset your CivicMatch password',
      emailType: 'password_reset',
      templateData: data,
      renderTemplate: async () => render(PasswordResetEmail(data)),
    });
  }

  /**
   * Send profile completion reminder email
   */
  async sendProfileReminderEmail(
    to: string,
    data: ProfileReminderEmailData,
    options: Omit<SendEmailOptions, 'to' | 'subject'> = {}
  ) {
    return this.sendTemplatedEmail({
      ...options,
      to,
      subject: `Complete your CivicMatch profile (${data.completionPercentage}% done)`,
      emailType: 'profile_reminder',
      templateData: data,
      renderTemplate: async () => render(ProfileReminderEmail(data)),
    });
  }

  /**
   * Send weekly matching email
   */
  async sendWeeklyMatchEmail(
    to: string,
    data: WeeklyMatchEmailData,
    options: Omit<SendEmailOptions, 'to' | 'subject'> = {}
  ) {
    const matchName = data.matchedUser.displayName;
    return this.sendTemplatedEmail({
      ...options,
      to,
      subject: `You might want to connect with ${matchName}`,
      emailType: 'weekly_match',
      templateData: data,
      renderTemplate: async () => render(WeeklyMatchEmail(data)),
    });
  }

  /**
   * Generic method to send templated emails
   */
  private async sendTemplatedEmail({
    to,
    subject,
    emailType,
    userId,
    templateVersion = '1.0',
    templateData,
    renderTemplate,
  }: {
    to: string | string[];
    subject: string;
    emailType?: EmailType;
    userId?: string;
    templateVersion?: string;
    templateData: Record<string, unknown> | WelcomeEmailData | PasswordResetEmailData | ProfileReminderEmailData | WeeklyMatchEmailData;
    renderTemplate: () => Promise<string>;
  }) {
    try {
      // Check if email is enabled
      if (!emailConfig.enabled) {
        console.log(`Email disabled - would have sent ${emailType} email to:`, to);
        return { success: false, error: 'Email disabled' };
      }

      // In test mode, just log the email
      if (emailConfig.testMode) {
        console.log('📧 Test Mode - Email would be sent:', {
          to,
          subject,
          emailType,
          userId,
          templateData,
        });
        return { success: true, data: { id: 'test-mode' } };
      }

      // Render the email template
      const html = await renderTemplate();

      // Send email via Resend
      const { data, error } = await resend.emails.send({
        from: emailConfig.fromEmail,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      });

      if (error) {
        console.error('Failed to send email via Resend:', error);
        return { success: false, error: error.message || 'Email send failed' };
      }

      // Log email send (if userId and emailType provided)
      if (userId && emailType && data?.id) {
        await this.emailLogService.logEmailSent({
          userId,
          emailType,
          resendId: data.id,
          recipientEmail: Array.isArray(to) ? to[0] : to,
          subject,
          templateVersion,
        });
      }

      console.log(`✅ Sent ${emailType} email to ${to}:`, data?.id);
      return { success: true, data };
    } catch (error) {
      console.error('EmailService error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown email error' 
      };
    }
  }

  /**
   * Send a plain text/HTML email (without templates)
   */
  async sendEmail(options: SendEmailOptions & { html?: string; text?: string }) {
    const { to, subject, html, text, userId, emailType, templateVersion } = options;

    try {
      if (!emailConfig.enabled) {
        console.log('Email disabled - would have sent email to:', to);
        return { success: false, error: 'Email disabled' };
      }

      if (emailConfig.testMode) {
        console.log('📧 Test Mode - Email would be sent:', { to, subject, html, text });
        return { success: true, data: { id: 'test-mode' } };
      }

      if (!html && !text) {
        throw new Error('Either html or text content must be provided');
      }

      let emailOptions: {
        from: string;
        to: string[];
        subject: string;
        html?: string;
        text?: string;
      };
      
      if (html) {
        emailOptions = {
          from: emailConfig.fromEmail,
          to: Array.isArray(to) ? to : [to],
          subject,
          html,
        };
        if (text) emailOptions.text = text;
      } else if (text) {
        emailOptions = {
          from: emailConfig.fromEmail,
          to: Array.isArray(to) ? to : [to],
          subject,
          text,
        };
      } else {
        throw new Error('Either HTML or text content must be provided');
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await resend.emails.send(emailOptions as any);

      if (error) {
        console.error('Failed to send email via Resend:', error);
        return { success: false, error: error.message || 'Email send failed' };
      }

      // Log email send (if userId and emailType provided)
      if (userId && emailType && data?.id) {
        await this.emailLogService.logEmailSent({
          userId,
          emailType,
          resendId: data.id,
          recipientEmail: Array.isArray(to) ? to[0] : to,
          subject,
          templateVersion: templateVersion || '1.0',
        });
      }

      console.log(`✅ Sent email to ${to}:`, data?.id);
      return { success: true, data };
    } catch (error) {
      console.error('EmailService.sendEmail error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown email error' 
      };
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
