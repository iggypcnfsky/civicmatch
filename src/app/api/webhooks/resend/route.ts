import { NextRequest, NextResponse } from 'next/server';
import { EmailLogService } from '@/lib/email/services/EmailLogService';

interface ResendWebhookEvent {
  type: 'email.sent' | 'email.delivered' | 'email.delivery_delayed' | 'email.bounced' | 'email.complained' | 'email.opened' | 'email.clicked';
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    // Additional fields depending on event type
    bounce_type?: string;
    complaint_type?: string;
    link?: {
      url: string;
    };
  };
}

// Map Resend event types to our status values
const eventToStatus: Record<ResendWebhookEvent['type'], string> = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.delivery_delayed': 'delayed',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.opened': 'opened',
  'email.clicked': 'clicked'
};

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (security)
    const signature = request.headers.get('resend-signature');
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('Missing RESEND_WEBHOOK_SECRET environment variable');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    // Get raw body for signature verification
    const body = await request.text();
    
    // Verify signature (implement based on Resend's signature method)
    if (signature && !verifyWebhookSignature(body, signature, webhookSecret)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse the webhook payload
    const event: ResendWebhookEvent = JSON.parse(body);
    
    console.log('Received Resend webhook:', {
      type: event.type,
      email_id: event.data.email_id,
      to: event.data.to
    });

    // Map event type to our status
    const status = eventToStatus[event.type];
    if (!status) {
      console.warn('Unknown event type:', event.type);
      return NextResponse.json({ message: 'Event type not handled' }, { status: 200 });
    }

    // Use EmailLogService to update status
    const emailLogService = new EmailLogService();
    const result = await emailLogService.updateEmailStatus({
      resendId: event.data.email_id,
      status: status as 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed',
      webhookData: {
        type: event.type,
        timestamp: event.created_at,
        bounce_type: event.data.bounce_type,
        complaint_type: event.data.complaint_type,
        clicked_url: event.data.link?.url
      }
    });

    if (!result || result.length === 0) {
      console.warn('No email log found for resend_id:', event.data.email_id);
      // This is OK - might be a test email or email sent before logging was implemented
      return NextResponse.json({ message: 'Email log not found, but webhook processed' }, { status: 200 });
    }

    console.log('Successfully updated email log:', {
      resend_id: event.data.email_id,
      new_status: status,
      updated_records: result.length
    });

    // Handle specific event types
    switch (event.type) {
      case 'email.bounced':
        // TODO: Add user to bounce suppression list if hard bounce
        console.log('Email bounced:', event.data.bounce_type);
        break;
      
      case 'email.complained':
        // TODO: Add user to complaint suppression list
        console.log('Spam complaint received:', event.data.complaint_type);
        break;
      
      case 'email.opened':
        // TODO: Track engagement metrics
        console.log('Email opened by user');
        break;
      
      case 'email.clicked':
        // TODO: Track click-through metrics
        console.log('Email link clicked:', event.data.link?.url);
        break;
    }

    return NextResponse.json({ message: 'Webhook processed successfully' }, { status: 200 });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Implement signature verification based on Resend's method
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function verifyWebhookSignature(body: string, signature: string, _secret: string): boolean {
  // TODO: Implement actual signature verification when Resend provides the algorithm
  // For now, return true if signature exists (basic validation)
  // This should be replaced with proper HMAC verification once documented
  
  if (!signature) {
    return false;
  }
  
  // Placeholder implementation - replace with actual verification
  // Example for HMAC-SHA256 (common pattern):
  // const expectedSignature = crypto
  //   .createHmac('sha256', secret)
  //   .update(body)
  //   .digest('hex');
  // return crypto.timingSafeEqual(
  //   Buffer.from(signature),
  //   Buffer.from(expectedSignature)
  // );
  
  return true; // Temporary - implement proper verification
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Resend webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}
