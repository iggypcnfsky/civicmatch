import { Resend } from 'resend';

// Initialize Resend client
const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  console.warn('RESEND_API_KEY not found. Email functionality will be disabled.');
}

export const resend = new Resend(apiKey);

// Email configuration
export const emailConfig = {
  fromEmail: process.env.RESEND_FROM_EMAIL || 'noreply@civicmatch.app',
  enabled: process.env.EMAIL_ENABLED === 'true',
  testMode: process.env.EMAIL_TEST_MODE === 'true',
  webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
} as const;

// Validate configuration on import
if (emailConfig.enabled && !apiKey) {
  throw new Error('EMAIL_ENABLED is true but RESEND_API_KEY is missing');
}
