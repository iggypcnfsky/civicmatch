import { JWT, GoogleAuth as GoogleAuthLib } from 'google-auth-library';

/**
 * Google Service Account authentication utility
 * Used for server-side Google Calendar API access
 */
export class GoogleAuth {
  private static instance: JWT | null = null;

  /**
   * Get authenticated JWT client for Google APIs
   */
  static async getAuthClient(): Promise<JWT> {
    if (!GoogleAuth.instance) {
      // Try JSON credentials first, then fall back to separate key/email
      const jsonCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
      
      // For debugging: check if we have both formats
      console.log('Has JSON credentials:', !!jsonCredentials);
      console.log('Has separate email/key:', !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);
      
      if (jsonCredentials) {
        try {
          console.log('Parsing JSON credentials...');
          const credentials = JSON.parse(jsonCredentials);
          console.log('JSON parsed successfully, client_email:', credentials.client_email);
          console.log('Private key length from JSON:', credentials.private_key?.length);
          console.log('Private key starts with:', credentials.private_key?.substring(0, 50));
          
          // Try to create the JWT instance with additional error handling
          console.log('Creating JWT instance from JSON credentials...');
          
          // Try different approaches if the first one fails
          try {
            // For domain-wide delegation, use subject to impersonate the calendar owner
            const subject = process.env.GOOGLE_CALENDAR_OWNER_EMAIL || credentials.client_email;
            console.log('Using subject for domain-wide delegation:', subject);
            
            GoogleAuth.instance = new JWT({
              email: credentials.client_email,
              key: credentials.private_key,
              subject: subject, // This enables domain-wide delegation
              scopes: [
                'https://www.googleapis.com/auth/calendar.events',
                'https://www.googleapis.com/auth/calendar'
              ]
            });
            console.log('JWT instance created successfully from JSON (method 1) with domain-wide delegation');
          } catch (jwtError) {
            console.error('JWT creation failed with method 1:', jwtError);
            
            // Try alternative approach: use the entire credentials object
            console.log('Trying alternative JWT creation method...');
            try {
              const subject = process.env.GOOGLE_CALENDAR_OWNER_EMAIL || credentials.client_email;
              GoogleAuth.instance = new JWT({
                keyFile: undefined, // Don't use keyFile
                key: credentials.private_key,
                email: credentials.client_email,
                subject: subject, // Domain-wide delegation
                additionalClaims: undefined,
                scopes: [
                  'https://www.googleapis.com/auth/calendar.events',
                  'https://www.googleapis.com/auth/calendar'
                ]
              });
              console.log('JWT instance created successfully from JSON (method 2) with domain-wide delegation');
            } catch (jwtError2) {
              console.error('JWT creation failed with method 2:', jwtError2);
              
              // Try creating from the full JSON object
              console.log('Trying method 3: fromJSON...');
              try {
                const jwtFromJson = new JWT(credentials);
                GoogleAuth.instance = jwtFromJson;
                GoogleAuth.instance.scopes = [
                  'https://www.googleapis.com/auth/calendar.events',
                  'https://www.googleapis.com/auth/calendar'
                ];
                console.log('JWT instance created successfully from JSON (method 3)');
              } catch (jwtError3) {
                console.error('JWT fromJSON failed, trying GoogleAuth method:', jwtError3);
                
                // Final attempt: Use GoogleAuth class with JSON credentials
                try {
                  console.log('Trying method 4: GoogleAuth with credentials...');
                  const auth = new GoogleAuthLib({
                    credentials: credentials,
                    scopes: [
                      'https://www.googleapis.com/auth/calendar.events',
                      'https://www.googleapis.com/auth/calendar'
                    ]
                  });
                  
                  // Get the JWT client from GoogleAuth
                  const jwtClient = await auth.getClient();
                  if (jwtClient instanceof JWT) {
                    GoogleAuth.instance = jwtClient;
                    console.log('JWT instance created successfully from GoogleAuth (method 4)');
                  } else {
                    throw new Error('GoogleAuth did not return a JWT client');
                  }
                } catch (jwtError4) {
                  console.error('All JWT creation methods failed. Final error:', jwtError4);
                  console.error('Original error:', jwtError);
                  throw jwtError; // Throw the original error
                }
              }
            }
          }
          console.log('Using JSON credentials for authentication');
        } catch (e) {
          console.error('Failed to parse or use JSON credentials:', e);
          console.error('Error details:', e instanceof Error ? e.message : 'Unknown error');
          throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON format: ' + (e instanceof Error ? e.message : 'Unknown error'));
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
        console.log('Private key length:', processedKey.length);
        console.log('Private key ends with:', processedKey.substring(processedKey.length - 50));

        try {
          const subject = process.env.GOOGLE_CALENDAR_OWNER_EMAIL || email;
          console.log('Using subject for domain-wide delegation (separate key method):', subject);
          
          GoogleAuth.instance = new JWT({
            email,
            key: processedKey,
            subject: subject, // Domain-wide delegation
            scopes: [
              'https://www.googleapis.com/auth/calendar.events',
              'https://www.googleapis.com/auth/calendar'
            ]
          });
          console.log('JWT instance created successfully with domain-wide delegation');
        } catch (jwtError) {
          console.error('Error creating JWT instance:', jwtError);
          throw jwtError;
        }
        console.log('Using separate email/key credentials for authentication');
      }

      const authenticatedEmail = jsonCredentials ? 
        JSON.parse(jsonCredentials).client_email : 
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      
      console.log('Google Service Account authenticated:', authenticatedEmail);
      console.log('Private key format validated successfully');
    }

    if (!GoogleAuth.instance) {
      throw new Error('Failed to initialize Google Auth instance');
    }
    
    return GoogleAuth.instance;
  }

  /**
   * Validate Google Calendar configuration
   */
  static validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if we have JSON credentials OR separate email/key
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
        errors.push('GOOGLE_SERVICE_ACCOUNT_EMAIL is required (when not using GOOGLE_SERVICE_ACCOUNT_JSON)');
      }

      if (!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
        errors.push('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is required (when not using GOOGLE_SERVICE_ACCOUNT_JSON)');
      }
    }

    if (!process.env.GOOGLE_CALENDAR_ID) {
      errors.push('GOOGLE_CALENDAR_ID is required');
    }

    if (!process.env.GOOGLE_PROJECT_ID) {
      errors.push('GOOGLE_PROJECT_ID is required');
    }

    // For domain-wide delegation, this is recommended
    if (!process.env.GOOGLE_CALENDAR_OWNER_EMAIL) {
      warnings.push('GOOGLE_CALENDAR_OWNER_EMAIL is recommended for domain-wide delegation');
    }

    if (warnings.length > 0) {
      console.warn('Google configuration warnings:', warnings);
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
      console.log('Starting Google authentication test...');
      const auth = await GoogleAuth.getAuthClient();
      console.log('Got auth client, attempting to authorize...');
      await auth.authorize();
      console.log('Google authentication test successful');
      return true;
    } catch (error) {
      console.error('Google authentication test failed:', error);
      
      // Log additional debug information
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        if ('code' in error) {
          console.error('Error code:', (error as { code?: string }).code);
        }
        
        // Check if this is the OpenSSL decoder error
        if (error.message.includes('DECODER routines::unsupported')) {
          console.error('This is the OpenSSL decoder error - issue with private key format or OpenSSL version in Vercel runtime');
        }
      }
      
      return false;
    }
  }
}
