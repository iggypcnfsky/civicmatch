import { JWT } from 'google-auth-library';

/**
 * Google Service Account authentication utility
 * Used for server-side Google Calendar API access
 */
export class GoogleAuth {
  private static instance: JWT | null = null;

  /**
   * Get authenticated JWT client for Google APIs
   */
  static getAuthClient(): JWT {
    if (!GoogleAuth.instance) {
      // Validate required environment variables
      const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

      if (!email || !privateKey) {
        throw new Error('Missing Google Service Account credentials. Check GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY environment variables.');
      }

      GoogleAuth.instance = new JWT({
        email,
        key: privateKey.replace(/\\n/g, '\n'), // Handle escaped newlines
        scopes: [
          'https://www.googleapis.com/auth/calendar.events',
          'https://www.googleapis.com/auth/calendar'
        ]
      });

      console.log('Google Service Account authenticated:', email);
    }

    return GoogleAuth.instance;
  }

  /**
   * Validate Google Calendar configuration
   */
  static validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      errors.push('GOOGLE_SERVICE_ACCOUNT_EMAIL is required');
    }

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
      errors.push('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is required');
    }

    if (!process.env.GOOGLE_CALENDAR_ID) {
      errors.push('GOOGLE_CALENDAR_ID is required');
    }

    if (!process.env.GOOGLE_PROJECT_ID) {
      errors.push('GOOGLE_PROJECT_ID is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Test authentication by making a simple API call
   */
  static async testAuthentication(): Promise<boolean> {
    try {
      const auth = GoogleAuth.getAuthClient();
      await auth.authorize();
      console.log('Google authentication test successful');
      return true;
    } catch (error) {
      console.error('Google authentication test failed:', error);
      return false;
    }
  }
}
