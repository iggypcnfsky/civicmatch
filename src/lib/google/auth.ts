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
      // Try JSON credentials first, then fall back to separate key/email
      const jsonCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
      
      if (jsonCredentials) {
        try {
          const credentials = JSON.parse(jsonCredentials);
          GoogleAuth.instance = new JWT({
            email: credentials.client_email,
            key: credentials.private_key,
            scopes: [
              'https://www.googleapis.com/auth/calendar.events',
              'https://www.googleapis.com/auth/calendar'
            ]
          });
          console.log('Using JSON credentials for authentication');
        } catch (e) {
          console.error('Failed to parse JSON credentials:', e);
          throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON format');
        }
      } else {
        // Fallback to separate email and key
        const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

        if (!email || !privateKey) {
          throw new Error('Missing Google Service Account credentials. Provide either GOOGLE_SERVICE_ACCOUNT_JSON or both GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY environment variables.');
        }

        // Handle different private key formats
        let processedKey = privateKey;
        
        // Handle escaped newlines first
        processedKey = processedKey.replace(/\\n/g, '\n');
        
        // If the key still doesn't look like PEM after newline processing, try base64 decode
        if (!processedKey.includes('-----BEGIN PRIVATE KEY-----')) {
          console.log('Key does not appear to be in PEM format, attempting base64 decode...');
          try {
            processedKey = Buffer.from(privateKey, 'base64').toString('utf8');
            console.log('Successfully decoded base64 private key');
          } catch (e) {
            console.error('Failed to decode base64 private key:', e);
            throw new Error('Private key must be in PEM format or valid base64-encoded PEM');
          }
        }
        
        // Final validation
        if (!processedKey.includes('-----BEGIN PRIVATE KEY-----')) {
          console.error('Processed key preview:', processedKey.substring(0, 100) + '...');
          throw new Error('Invalid private key format. Key must be a valid PEM format.');
        }
        
        console.log('Private key format validated - starts with:', processedKey.substring(0, 50) + '...');

        GoogleAuth.instance = new JWT({
          email,
          key: processedKey,
          scopes: [
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/calendar'
          ]
        });
        console.log('Using separate email/key credentials for authentication');
      }

      const authenticatedEmail = jsonCredentials ? 
        JSON.parse(jsonCredentials).client_email : 
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      
      console.log('Google Service Account authenticated:', authenticatedEmail);
      console.log('Private key format validated successfully');
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
      
      // Log additional debug information
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        if ('code' in error) {
          console.error('Error code:', (error as { code?: string }).code);
        }
      }
      
      return false;
    }
  }
}
