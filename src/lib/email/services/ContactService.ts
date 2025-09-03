import { resend, emailConfig } from '../resend';

export interface CreateContactData {
  email: string;
  firstName: string;
  lastName: string;
  userId?: string; // For logging purposes
}

export interface CreateContactResult {
  success: boolean;
  contactId?: string;
  error?: string;
}

export class ContactService {
  private audienceId: string;

  constructor() {
    this.audienceId = process.env.RESEND_AUDIENCE_ID || '';
    
    if (emailConfig.enabled && !this.audienceId) {
      console.warn('RESEND_AUDIENCE_ID not found. Contact creation will be disabled.');
    }
  }

  /**
   * Add a new contact to the Resend audience
   */
  async createContact(data: CreateContactData): Promise<CreateContactResult> {
    try {
      // Check if email functionality is enabled
      if (!emailConfig.enabled) {
        console.log('Email disabled - would have added contact:', data.email);
        return { success: false, error: 'Email disabled' };
      }

      // Check if audience ID is configured
      if (!this.audienceId) {
        console.warn('RESEND_AUDIENCE_ID not configured - skipping contact creation for:', data.email);
        return { success: false, error: 'Audience ID not configured' };
      }

      // In test mode, just log the contact creation
      if (emailConfig.testMode) {
        console.log('📧 Test Mode - Contact would be created:', {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          audienceId: this.audienceId,
        });
        return { success: true, contactId: 'test-mode' };
      }

      // Create contact in Resend
      const result = await resend.contacts.create({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        unsubscribed: false,
        audienceId: this.audienceId,
      });

      if (result.error) {
        console.error('Failed to create Resend contact:', result.error);
        return { 
          success: false, 
          error: result.error.message || 'Contact creation failed' 
        };
      }

      console.log(`✅ Created Resend contact for ${data.email}:`, result.data?.id);
      return { 
        success: true, 
        contactId: result.data?.id 
      };

    } catch (error) {
      console.error('ContactService error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown contact creation error' 
      };
    }
  }

  /**
   * Extract first and last name from display name
   */
  private parseDisplayName(displayName: string): { firstName: string; lastName: string } {
    const nameParts = displayName.trim().split(/\s+/);
    
    if (nameParts.length === 1) {
      return { firstName: nameParts[0], lastName: '' };
    }
    
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');
    
    return { firstName, lastName };
  }

  /**
   * Create contact from user profile data
   */
  async createContactFromProfile(
    email: string, 
    displayName: string, 
    userId?: string
  ): Promise<CreateContactResult> {
    const { firstName, lastName } = this.parseDisplayName(displayName);
    
    return this.createContact({
      email,
      firstName,
      lastName,
      userId,
    });
  }
}

// Export singleton instance
export const contactService = new ContactService();
